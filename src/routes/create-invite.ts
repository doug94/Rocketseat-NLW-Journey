import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { dayjs } from "../lib/dayjs";
import { getMailClient } from "../lib/mail";
import nodemailer from "nodemailer";
import { ClientError } from "../errors/client-error";
import { env } from "../env";

export async function createInvite(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/trips/:tripId/invites', {
    schema: {
      params: z.object({
        tripId: z.string().uuid()
      }),
      body: z.object({
        email: z.string().email()
      })
    }
  }, async (request) => {
    const { tripId } = request.params;
    const { email } = request.body;

    const trip = await prisma.trip.findUnique({
      where: { id: tripId }
    });

    if (!trip) throw new ClientError('Trip not found.');

    const participant = await prisma.participant.create({
      data: { email, trip_id: tripId }
    });

    const formattedStartDate = dayjs(trip.starts_at).format('LL');
    const formattedEndDate = dayjs(trip.ends_at).format('LL');

    const confirmationLink = `${env.API_BASE_URL}/trips/${participant.id}/confirm`;

    const mail = await getMailClient();


    const message = await mail.sendMail({
      from: {
        name: 'Equipe Planner',
        address: 'oi@plann.er'
      },
      to: participant.email,
      subject: `Confirme sua presença na viagem para ${trip.destination}`,
      html: `
          <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
            <p>Você foi convidado(a) para participar de uma viagem para <strong>${trip.destination}</strong> nas datas de <strong>${formattedStartDate}</strong> até <strong>${formattedEndDate}</strong>.</p>
            <br>
            <p>Para confirmar a sua presença na viagem, clique no link abaixo:</p>
            <br>
            <p><a href="${confirmationLink}">Confirmar viagem</a></p>
            <br>
            <p>Caso você não saiba do que se trata esse email, apenas ignore-o.</p>
          </div>`.trim()
    });

    console.log(nodemailer.getTestMessageUrl(message));

    return { participantId: participant.id };
  });
}