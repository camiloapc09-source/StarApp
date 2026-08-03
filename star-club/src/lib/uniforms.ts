import { db } from "@/lib/db";

export const UNIFORM_PRICES: Record<string, number> = {
  TRAINING:     75000,
  GAME:        100000,
  PRESENTATION: 150000,
};

export const UNIFORM_NAMES: Record<string, string> = {
  TRAINING:     "Uniforme de entrenamiento",
  GAME:         "Uniforme de juego (doble faz)",
  PRESENTATION: "Uniforme de presentación",
};

export const UNIFORM_SIZES = ["12", "14", "16", "18", "XS", "S", "M", "L", "XL", "XXL"] as const;

/** Apellidos sugeridos a partir del nombre completo del deportista. */
export function playerSurnames(fullName: string): string[] {
  const words = fullName.trim().split(/\s+/);
  return words.length >= 3 ? words.slice(-2) : words.slice(-1);
}

/**
 * Reglas del uniforme de juego: el nombre debe ser una palabra del nombre del
 * deportista y el número no puede estar en uso por otro pedido **del mismo club**.
 * Devuelve un mensaje de error, o null si todo está bien.
 *
 * `enforceName` se desactiva para el admin, que puede escribir cualquier rotulado.
 */
export async function validateGameUniform(opts: {
  clubId: string;
  playerName: string;
  nameOnJersey: string;
  numberOnJersey?: number | null;
  enforceName: boolean;
  excludeOrderId?: string;
}): Promise<string | null> {
  const { clubId, playerName, nameOnJersey, numberOnJersey, enforceName, excludeOrderId } = opts;

  if (enforceName) {
    const words = playerName.trim().split(/\s+/);
    const submitted = nameOnJersey.toLowerCase();
    if (!words.some((w) => w.toLowerCase() === submitted)) {
      return `El nombre en la camiseta debe ser una de las palabras del nombre del deportista (${playerName}).`;
    }
  }

  if (numberOnJersey == null) {
    return "El uniforme de juego requiere un número en la camiseta.";
  }

  const conflict = await db.uniformOrder.findFirst({
    where: {
      type: "GAME",
      numberOnJersey,
      status: { notIn: ["CANCELLED"] },
      player: { clubId },
      ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
    },
  });
  if (conflict) return `El número #${numberOnJersey} ya está en uso en otro pedido del club.`;

  return null;
}

/** Avisa a los admins del club que entró un pedido nuevo. Nunca lanza. */
export async function notifyAdminsNewOrder(opts: {
  clubId: string;
  playerName: string;
  type: string;
  jerseySize: string;
  shortsSize: string;
  numberOnJersey?: number | null;
  origin: "PARENT" | "PLAYER";
}) {
  try {
    const admins = await db.user.findMany({
      where: { clubId: opts.clubId, role: "ADMIN" },
      select: { id: true },
    });
    if (admins.length === 0) return;

    const who = opts.origin === "PLAYER" ? "El deportista" : "El acudiente de";
    await db.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        title: "Nuevo pedido de uniforme",
        message: `${who} ${opts.playerName} solicitó ${UNIFORM_NAMES[opts.type] ?? opts.type} — Camiseta ${opts.jerseySize} / Pantaloneta ${opts.shortsSize}${opts.numberOnJersey != null ? ` #${opts.numberOnJersey}` : ""}.`,
        type: "INFO",
        link: "/dashboard/admin/uniforms",
      })),
    });
  } catch { /* no crítico */ }
}

/**
 * Avisa al deportista y a sus acudientes que el admin les registró un pedido.
 * Nunca lanza.
 */
export async function notifyFamilyOrderCreated(opts: {
  playerId: string;
  type: string;
  jerseySize: string;
  shortsSize: string;
  numberOnJersey?: number | null;
  totalPrice: number;
}) {
  try {
    const player = await db.player.findUnique({
      where: { id: opts.playerId },
      select: {
        userId: true,
        parentLinks: { select: { parent: { select: { userId: true } } } },
      },
    });
    if (!player) return;

    const userIds = [player.userId, ...player.parentLinks.map((l) => l.parent.userId)];
    const message = `El club registró un pedido de ${UNIFORM_NAMES[opts.type] ?? opts.type} — Camiseta ${opts.jerseySize} / Pantaloneta ${opts.shortsSize}${opts.numberOnJersey != null ? ` #${opts.numberOnJersey}` : ""}. Valor: $${opts.totalPrice.toLocaleString("es-CO")}.`;

    await db.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        title: "Pedido de uniforme registrado",
        message,
        type: "INFO",
      })),
    });
  } catch { /* no crítico */ }
}
