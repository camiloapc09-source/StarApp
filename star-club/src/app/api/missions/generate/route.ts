import { NextRequest } from "next/server";
import { requireRole, isResponse, apiOk } from "@/lib/api";

const MISSIONS_POOL: Record<string, { title: string; description: string; xpReward: number; type: string; icon: string }[]> = {
  home: [
    { title: "Dribbling en casa", description: "Practica dribbling estático con tu mano dominante durante 10 minutos sin perder el balón.", xpReward: 30, type: "DAILY", icon: "🏀" },
    { title: "Mano débil en casa", description: "Practica dribbling con tu mano no dominante durante 10 minutos frente al espejo.", xpReward: 40, type: "DAILY", icon: "💪" },
    { title: "Rutina de fuerza", description: "Completa 3 series de 20 sentadillas, 15 flexiones y 20 abdominales en casa.", xpReward: 50, type: "DAILY", icon: "🏋️" },
    { title: "Visualización táctica", description: "Mira 15 minutos de jugadas NBA y describe 3 movimientos clave en un cuaderno.", xpReward: 35, type: "WEEKLY", icon: "📹" },
    { title: "Equilibrio y coordinación", description: "Practica equilibrio sobre una pierna durante 1 minuto cada lado, 5 repeticiones.", xpReward: 25, type: "DAILY", icon: "⚖️" },
    { title: "Pases contra la pared", description: "Haz 100 pases de pecho contra la pared a 1 metro de distancia sin fallar.", xpReward: 35, type: "DAILY", icon: "🧱" },
    { title: "Saltos verticales", description: "Completa 4 series de 10 saltos explosivos procurando máxima altura cada vez.", xpReward: 45, type: "DAILY", icon: "⬆️" },
    { title: "Estudio del reglamento", description: "Lee las reglas de baloncesto FIBA y responde correctamente 5 preguntas de tu entrenador.", xpReward: 60, type: "CHALLENGE", icon: "📖" },
  ],
  park: [
    { title: "Carrera de velocidad", description: "Realiza 6 carreras de 30 metros con 30 segundos de descanso entre cada una.", xpReward: 40, type: "DAILY", icon: "💨" },
    { title: "Dribbling en movimiento", description: "Lleva el balón driblando 500 metros en el parque sin perderlo.", xpReward: 50, type: "DAILY", icon: "🏃" },
    { title: "Defensa lateral", description: "Practica 10 minutos de desplazamiento lateral defensivo en un espacio de 5 metros.", xpReward: 40, type: "DAILY", icon: "🛡️" },
    { title: "Cambios de ritmo", description: "Alterna trote suave y sprint al máximo cada 20 metros durante 10 minutos.", xpReward: 45, type: "WEEKLY", icon: "🔄" },
    { title: "Coordinación con escalera", description: "Realiza ejercicios de escalera de agilidad durante 15 minutos en el parque.", xpReward: 55, type: "WEEKLY", icon: "🪜" },
    { title: "Trabajo de pies", description: "Completa 20 minutos de drills de pisadas rápidas: cruzadas, laterales y frontales.", xpReward: 50, type: "DAILY", icon: "👟" },
    { title: "Resistencia cardiovascular", description: "Corre 5 minutos a ritmo moderado sin detener el dribbling del balón.", xpReward: 60, type: "WEEKLY", icon: "❤️" },
  ],
  gym: [
    { title: "Tiro libre — 100 intentos", description: "Lanza 100 tiros libres y registra cuántos encestas. El objetivo es superar el 60%.", xpReward: 70, type: "CHALLENGE", icon: "🎯" },
    { title: "Fundamentos de bandeja", description: "Realiza 50 bandejas alternando lado derecho e izquierdo en la cancha.", xpReward: 55, type: "DAILY", icon: "🏀" },
    { title: "Tiro en movimiento", description: "Practica 30 tiros en movimiento desde ángulos diferentes de la zona del poste.", xpReward: 60, type: "WEEKLY", icon: "🌀" },
    { title: "1 vs 1 defensivo", description: "Juega 5 rondas de 1 vs 1 con un compañero enfocándote en no ceder línea de base.", xpReward: 65, type: "CHALLENGE", icon: "⚔️" },
    { title: "Velocidad de liberación", description: "Practica para reducir tu tiempo de preparación al tiro. Completa 40 tiros en 5 minutos.", xpReward: 75, type: "WEEKLY", icon: "⚡" },
    { title: "Pases en movimiento", description: "Con un compañero, completa 80 pases de pecho, picado y sobre cabeza en movimiento.", xpReward: 55, type: "DAILY", icon: "🤝" },
    { title: "Defensa de perímetro", description: "Practica posición defensiva de perímetro en situación de 1 vs 1 durante 20 minutos.", xpReward: 60, type: "WEEKLY", icon: "🛡️" },
    { title: "Triple amenaza", description: "Practica la posición de triple amenaza y salida a cada dirección: 30 repeticiones.", xpReward: 50, type: "DAILY", icon: "3️⃣" },
  ],
};

export async function GET(req: NextRequest) {
  const session = await requireRole(["ADMIN", "COACH"]);
  if (isResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const location = (searchParams.get("location") ?? "gym") as keyof typeof MISSIONS_POOL;
  const pool = MISSIONS_POOL[location] ?? MISSIONS_POOL.gym;

  const mission = pool[Math.floor(Math.random() * pool.length)];
  return apiOk({ ...mission, location });
}
