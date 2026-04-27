import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hash } from "bcryptjs";

function createDb() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter: new PrismaPg(pool) } as never);
}
const db = createDb();

const BB_ID = "ball-breakers";

// ── Helper: parse height to cm ────────────────────────────
function parseHeight(s: string): number | null {
  if (!s || s.trim() === "" || /no\s*s[eé]/i.test(s)) return null;
  const clean = s.replace(/[^\d.,]/g, "").replace(",", ".");
  const v = parseFloat(clean);
  if (isNaN(v)) return null;
  if (v < 3) return Math.round(v * 100); // meters → cm
  return v;
}

// ── Helper: parse weight to kg ────────────────────────────
function parseWeight(s: string): number | null {
  if (!s || s.trim() === "" || /no\s*s[eé]/i.test(s)) return null;
  const clean = s.replace(/[^\d.,]/g, "").replace(",", ".");
  const v = parseFloat(clean);
  if (isNaN(v)) return null;
  if (v > 0 && v < 10) return v * 10; // "5.1" typo → 51 kg
  return v;
}

// ── Helper: category name from age (ref date: April 27, 2026) ──
function categoryName(dob: Date, gender: "M" | "F"): string {
  const ref = new Date("2026-04-27");
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age--;
  const g = gender === "M" ? " M" : " F";
  if (age <= 9)  return `Voley Kid${g}`;
  if (age <= 12) return `Mini Voley${g}`;
  if (age <= 14) return `Infantil${g}`;
  if (age <= 17) return `Menores${g}`;
  return `Juvenil${g}`;
}

// ── Helper: normalize volleyball position ─────────────────
function normPos(p: string): string | null {
  if (!p || /no\s*s[eé]|^\.$|^n$/i.test(p.trim())) return null;
  const m: Record<string, string> = {
    punta: "Punta", central: "Central", libero: "Líbero", líbero: "Líbero",
    armador: "Armador", opuesto: "Opuesto",
  };
  return m[p.trim().toLowerCase()] ?? p.trim();
}

// ── Helper: monthly amount by sede ───────────────────────
function monthlyAmount(sede: string): number {
  if (sede === "NORTE") return 100000;
  if (sede === "CENTRO") return 90000;
  return 80000; // SUR
}

// ────────────────────────────────────────────────────────────
// PLAYER DATA — 64 unique athletes (deduplicated, latest entry)
// ────────────────────────────────────────────────────────────
interface PlayerRow {
  name: string;
  doc: string;
  dob: string; // DD/MM/YYYY
  gender: "M" | "F";
  sede: "SUR" | "CENTRO" | "NORTE";
  height: string;
  weight: string;
  position: string;
  eps: string;
  playerPhone: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
}

const PLAYERS: PlayerRow[] = [
  { name: "Sophie Martínez Jiménez", doc: "1046723097", dob: "27/09/2014", gender: "F", sede: "SUR", height: "157", weight: "54", position: "Punta", eps: "Magisterio", playerPhone: "3004719994", parentName: "Cindy Jiménez", parentPhone: "3004719994", parentEmail: "carojima1221@hotmail.com" },
  { name: "María Alejandra Castrillón Rada", doc: "1042264422", dob: "27/09/2012", gender: "F", sede: "NORTE", height: "167", weight: "63", position: "Central", eps: "Sanitas", playerPhone: "304369919", parentName: "Ciro Castrillón Sanchez", parentPhone: "3002511371", parentEmail: "yleannyrada@gmail.com" },
  { name: "Laura Camila Paez De La Peña", doc: "1043693267", dob: "21/07/2009", gender: "F", sede: "SUR", height: "1.70", weight: "50", position: "Central", eps: "Cajacopi", playerPhone: "3028530651", parentName: "Paola De La Peña", parentPhone: "3012026101", parentEmail: "Dilanylaura12@hotmail.com" },
  { name: "Isabella Rodriguez Estrada", doc: "1122524544", dob: "27/04/2011", gender: "F", sede: "CENTRO", height: "156", weight: "50", position: "Punta", eps: "Sanitas", playerPhone: "3215809522", parentName: "Karen Estrada", parentPhone: "3212098829", parentEmail: "katis0427@gmail.com" },
  { name: "Valentina Villamizar Jiménez", doc: "1194967064", dob: "21/05/2011", gender: "F", sede: "SUR", height: "1.62", weight: "61", position: "Punta", eps: "", playerPhone: "3160178294", parentName: "Yaneris Jiménez", parentPhone: "3014429093", parentEmail: "valentinavillamizarjimenez2105@gmail.com" },
  { name: "Natalia Isabel Maestre Robles", doc: "1043676455", dob: "23/06/2008", gender: "F", sede: "SUR", height: "", weight: "", position: "Punta", eps: "", playerPhone: "3205630714", parentName: "Damaris Díaz", parentPhone: "3205630714", parentEmail: "nataliarobles621@gmail.com" },
  { name: "Sofía Alejandra Ospino de Alba", doc: "1041697092", dob: "24/10/2011", gender: "F", sede: "CENTRO", height: "1.45", weight: "40", position: "Libero", eps: "Famisanar", playerPhone: "3206550644", parentName: "Yesenia de Alba", parentPhone: "3245519801", parentEmail: "sofiaospino409@gmail.com" },
  { name: "Sareth Andrea Suárez Pineda", doc: "1047050743", dob: "03/06/2011", gender: "F", sede: "SUR", height: "1.57", weight: "45", position: "Libero", eps: "Salud total", playerPhone: "3237788542", parentName: "Paola Pineda", parentPhone: "3016193983", parentEmail: "sarethsuarez0306@gmail.com" },
  { name: "Matias Vega", doc: "1043450473", dob: "13/04/2009", gender: "M", sede: "SUR", height: "184", weight: "70", position: "", eps: "Salud total", playerPhone: "3005630327", parentName: "Maria Camila Ripoll", parentPhone: "3005640980", parentEmail: "matiavega13@gmail.com" },
  { name: "Camila Andrea Ucrós Barceló", doc: "1043455293", dob: "11/11/2010", gender: "F", sede: "SUR", height: "1.70", weight: "60", position: "Central", eps: "Salud total", playerPhone: "3006910100", parentName: "Clarett Barceló", parentPhone: "3017495610", parentEmail: "Clarettbarcelo4@gmail.com" },
  { name: "Samanta Alvis Navarro", doc: "1043666935", dob: "22/11/2005", gender: "F", sede: "NORTE", height: "1.50", weight: "56.4", position: "Libero", eps: "Salud total", playerPhone: "3181915805", parentName: "Bleidis Navarro Oviedo", parentPhone: "3107406721", parentEmail: "Wilsonalvis@hotmail.com" },
  { name: "Samuel Díazgranados Gómez", doc: "1044626064", dob: "23/11/2007", gender: "M", sede: "NORTE", height: "180", weight: "89", position: "Central", eps: "Colsanitas", playerPhone: "3215922936", parentName: "Milena Patricia Gómez Freile", parentPhone: "3012963873", parentEmail: "samueldiazgranadosgomez@gmail.com" },
  { name: "Camilo Carmona", doc: "1046710571", dob: "18/10/2011", gender: "M", sede: "CENTRO", height: "170", weight: "60", position: "Punta", eps: "Sura", playerPhone: "3128802892", parentName: "Luis Carmona", parentPhone: "3104198386", parentEmail: "camiloandrescarmonamendoza@gmail.com" },
  { name: "Samuel David Carmona Mendoza", doc: "1044218990", dob: "05/06/2009", gender: "M", sede: "CENTRO", height: "1.74", weight: "60", position: "Armador", eps: "Sura", playerPhone: "3113905250", parentName: "Luis Carmona", parentPhone: "3104198386", parentEmail: "Samu78602@gmail.com" },
  { name: "Maria Isabel Suarez Aristizabal", doc: "1188213904", dob: "08/09/2010", gender: "F", sede: "NORTE", height: "1.63", weight: "58", position: "Punta", eps: "Sanitas", playerPhone: "3009858175", parentName: "Mary Sol Aristizabal Pelaez", parentPhone: "3107010344", parentEmail: "suarezaristizabalmariaisabel@gmail.com" },
  { name: "Luciana Verbel Rodríguez", doc: "1140912051", dob: "27/06/2012", gender: "F", sede: "NORTE", height: "149", weight: "49", position: "Libero", eps: "Salud total", playerPhone: "3053300510", parentName: "Ivonne Rodríguez", parentPhone: "3023753935", parentEmail: "lvonlg73@gmail.com" },
  { name: "Mateo Angel Carrillo Aguilar", doc: "1043669713", dob: "14/09/2006", gender: "M", sede: "SUR", height: "163", weight: "50", position: "Libero", eps: "Sanitas", playerPhone: "3183184577", parentName: "Sandra Judith", parentPhone: "3173131619", parentEmail: "Mateoangel1409@gmail.com" },
  { name: "Sofia Isabel Suarez Salazar", doc: "1127538444", dob: "07/03/2012", gender: "F", sede: "NORTE", height: "1.60", weight: "60", position: "Armador", eps: "Sura", playerPhone: "3117559516", parentName: "Carolina Salazar", parentPhone: "3133520830", parentEmail: "Casv84@gmail.com" },
  { name: "Emma Luna Barrios Díaz", doc: "1043696321", dob: "04/11/2014", gender: "F", sede: "NORTE", height: "159", weight: "56.3", position: "", eps: "Sanitas", playerPhone: "3114183532", parentName: "Díana Díaz Pallares", parentPhone: "3114183532", parentEmail: "diananinoska80@hotmail.com" },
  { name: "Aileen Gisell Sánchez Camargo", doc: "000000AILEEN", dob: "14/02/2014", gender: "F", sede: "SUR", height: "1.50", weight: "52", position: "Central", eps: "Salud Total", playerPhone: "3003994392", parentName: "Yeimy Balza Vélez", parentPhone: "3003994392", parentEmail: "yeimybalza458@gmail.com" },
  { name: "Luciana Torres Munévar", doc: "1043457706", dob: "08/11/2011", gender: "F", sede: "CENTRO", height: "169", weight: "52", position: "Armador", eps: "Sanitas", playerPhone: "3014600485", parentName: "Ligia Munévar", parentPhone: "3014600485", parentEmail: "Ligia.munevar@gmail.com" },
  { name: "Valentina Peña Olivares", doc: "1146544585", dob: "30/07/2019", gender: "F", sede: "NORTE", height: "126", weight: "35", position: "", eps: "Colsanitas", playerPhone: "", parentName: "Mercedes Olivares", parentPhone: "3164345168", parentEmail: "meolgo20@hotmail.com" },
  { name: "Daniela Sofía Guzmán Salcedo", doc: "1044652418", dob: "20/02/2014", gender: "F", sede: "SUR", height: "138", weight: "30", position: "Libero", eps: "Sanidad policia", playerPhone: "3015221242", parentName: "Ibis Salcedo", parentPhone: "3015221242", parentEmail: "ibispaolas@gmail.com" },
  { name: "Allen Vergara", doc: "1125118400", dob: "10/10/2007", gender: "M", sede: "NORTE", height: "1.70", weight: "56", position: "Central", eps: "Sura", playerPhone: "3243091707", parentName: "Patricia Borja", parentPhone: "3008122574", parentEmail: "allenvergara2007@gmail.com" },
  { name: "Valentina Simmonds Simanca", doc: "1041699267", dob: "15/10/2014", gender: "F", sede: "NORTE", height: "1.61", weight: "51", position: "", eps: "Sanitas", playerPhone: "3016642399", parentName: "Yerly Simanca", parentPhone: "3016642399", parentEmail: "yerlismaria3015@gmail.com" },
  { name: "Isabella María Acuña Pinillos", doc: "1043681574", dob: "09/01/2010", gender: "F", sede: "SUR", height: "160", weight: "48", position: "Armador", eps: "Sura", playerPhone: "3046112977", parentName: "Elia Pinillos", parentPhone: "3148245309", parentEmail: "alande1509@hotmail.com" },
  { name: "Alexandra Isabel Zabaleta Ariza", doc: "1048070239", dob: "08/05/2007", gender: "F", sede: "SUR", height: "1.70", weight: "60", position: "Punta", eps: "Viva 1A", playerPhone: "3105520914", parentName: "Milagros Zabaleta", parentPhone: "3126182681", parentEmail: "AlexandraIsabelZabaletaariza@gmail.com" },
  { name: "Litzy Loriet Alvarez Angarita", doc: "1029862671", dob: "04/10/2010", gender: "F", sede: "SUR", height: "1.60", weight: "50", position: "Punta", eps: "Salud total", playerPhone: "3046498000", parentName: "Lizeth Angarita Mendez", parentPhone: "3152753326", parentEmail: "Liz.angarita05@gmail.com" },
  { name: "Salomé Meza Macías", doc: "1043689392", dob: "08/08/2016", gender: "F", sede: "CENTRO", height: "150", weight: "53", position: "Punta", eps: "Clínica policía", playerPhone: "3205052534", parentName: "Stefanny Macías Calderón", parentPhone: "3188723101", parentEmail: "Chefy1990@hotmail.com" },
  { name: "Isabella Osorio Gonzalez", doc: "1043470680", dob: "24/06/2015", gender: "F", sede: "SUR", height: "1.45", weight: "49", position: "", eps: "Salud total", playerPhone: "3113279606", parentName: "Liliana Gonzalez Gómez", parentPhone: "3113279606", parentEmail: "Liliana242610@gmail.com" },
  { name: "Samuel Olivo Noriega", doc: "1046711730", dob: "08/03/2012", gender: "M", sede: "SUR", height: "174", weight: "", position: "Punta", eps: "Sura", playerPhone: "", parentName: "Andersson Olivo", parentPhone: "3003654566", parentEmail: "andersson.olivo@gmail.com" },
  { name: "Samantha Albino Barreto", doc: "1044639232", dob: "18/05/2010", gender: "F", sede: "SUR", height: "1.67", weight: "51", position: "Central", eps: "Sanitas", playerPhone: "3234156050", parentName: "Sandra Albino", parentPhone: "3103635566", parentEmail: "salbino1942@gmail.com" },
  { name: "Nairo José Montenegro Martínez", doc: "1046722683", dob: "12/08/2014", gender: "M", sede: "SUR", height: "1.39", weight: "32", position: "Armador", eps: "Estamento sanidad militar", playerPhone: "3113712562", parentName: "Nairo Antonio Montenegro Viloria", parentPhone: "3122028226", parentEmail: "naanmovi2@yahoo.es" },
  { name: "Victoria Molina Acuña", doc: "1046715674", dob: "20/02/2013", gender: "F", sede: "CENTRO", height: "1.30", weight: "60", position: "Central", eps: "Sura", playerPhone: "3150586115", parentName: "Tutor de Victoria Molina", parentPhone: "3150586115", parentEmail: "mmolina87_4@hotmail.com" },
  { name: "Kyran Arias Deossa", doc: "TIKYRANARIAS2011", dob: "09/07/2011", gender: "F", sede: "CENTRO", height: "1.63", weight: "45", position: "Punta", eps: "Sanitas", playerPhone: "3183506431", parentName: "Keenny De Ossa", parentPhone: "3007710414", parentEmail: "keenny02@gmail.com" },
  { name: "Karla Isabella Manzano Parra", doc: "1092950418", dob: "12/09/2011", gender: "F", sede: "CENTRO", height: "1.61", weight: "55", position: "Punta", eps: "Sanitas", playerPhone: "3054830605", parentName: "Judith Johanna Parra Quintero", parentPhone: "3208766016", parentEmail: "kmanzanoparra@gmail.com" },
  { name: "Cristian José Better Herrera", doc: "1045696313", dob: "04/08/2007", gender: "M", sede: "SUR", height: "1.75", weight: "73", position: "Punta", eps: "Mutual ser", playerPhone: "3027162873", parentName: "Karen Herrera", parentPhone: "3015271589", parentEmail: "cristianbetter34@gmail.com" },
  { name: "Sebastian Garces", doc: "1044633601", dob: "20/02/2009", gender: "M", sede: "SUR", height: "167", weight: "52", position: "Punta", eps: "Sura", playerPhone: "3019194506", parentName: "Gina Graciela Garces", parentPhone: "3012077079", parentEmail: "garcessebastian116@gmail.com" },
  { name: "María Fernanda Rebolledo López", doc: "1044640572", dob: "05/11/2010", gender: "F", sede: "SUR", height: "1.54", weight: "47", position: "Punta", eps: "Sura", playerPhone: "3017595052", parentName: "Katya Lorena López Orellano", parentPhone: "3005371740", parentEmail: "klopezorellano@gmail.com" },
  { name: "Yosy Esteban Rada Llerena", doc: "1047043936", dob: "25/07/2007", gender: "M", sede: "SUR", height: "1.74", weight: "66", position: "Punta", eps: "Cajacopi", playerPhone: "3045827949", parentName: "Nidia Llerena Osorio", parentPhone: "3003137437", parentEmail: "nidiallerenaosorio@gmail.com" },
  { name: "Vanedi Eliz Sandoval Rojas", doc: "1044645431", dob: "30/01/2012", gender: "F", sede: "SUR", height: "1.54", weight: "40", position: "", eps: "Clínica policía", playerPhone: "3126103708", parentName: "Vanessa Rojas / Edim Sandoval", parentPhone: "3054870312", parentEmail: "vanedifashion31@gmail.com" },
  { name: "Santiago David Ruiz Reyes", doc: "1043456642", dob: "12/03/2011", gender: "M", sede: "SUR", height: "1.66", weight: "51", position: "Central", eps: "Cajacopi", playerPhone: "3136942117", parentName: "Mayra Alejandra Reyes Carvajal", parentPhone: "3008102699", parentEmail: "santiagoruizreyes.cofon@gmail.com" },
  { name: "María Alejandra Rodriguez Yance", doc: "TIMARIARODRIGUEZ2012", dob: "23/10/2012", gender: "F", sede: "SUR", height: "1.53", weight: "35", position: "Punta", eps: "Sura", playerPhone: "3058656759", parentName: "María Garavito", parentPhone: "3043677402", parentEmail: "Rodriguezyancemariaalejandra@gmail.com" },
  { name: "Camila Andrea Contreras Reyes", doc: "1043462780", dob: "17/07/2013", gender: "F", sede: "SUR", height: "1.70", weight: "60", position: "Opuesto", eps: "Salud total", playerPhone: "3208562092", parentName: "Kelly Contreras", parentPhone: "3011331977", parentEmail: "Camilitacr1707@gmail.com" },
  { name: "Andrés Mauricio Buelvas Luna", doc: "1048075518", dob: "24/09/2010", gender: "M", sede: "SUR", height: "176", weight: "65", position: "Punta", eps: "Sanitas", playerPhone: "3146740578", parentName: "Carmen Bedys Luna Navarro", parentPhone: "3117922732", parentEmail: "aandresbuelvas2004@gmail.com" },
  { name: "Maria Isabel Torres Herrera", doc: "1045732582", dob: "22/08/2013", gender: "F", sede: "SUR", height: "1.51", weight: "59", position: "Armador", eps: "Nueva EPS", playerPhone: "3053695946", parentName: "Zoath Herrera", parentPhone: "3175509909", parentEmail: "Zohemo@hotmail.com" },
  { name: "Veronica Alejandra Lanza Diaz", doc: "6066749", dob: "05/07/2012", gender: "F", sede: "NORTE", height: "1.52", weight: "49", position: "Central", eps: "Nueva EPS", playerPhone: "3233415242", parentName: "Andreina Diaz", parentPhone: "3238097046", parentEmail: "Verolanzad@gmail.com" },
  { name: "Antonia Torres Ramos", doc: "1011244008", dob: "28/06/2016", gender: "F", sede: "NORTE", height: "1.28", weight: "25", position: "Punta", eps: "Colsanitas", playerPhone: "3009907157", parentName: "Kety Estela Ramos", parentPhone: "3013392338", parentEmail: "ketyestela2017@gmail.com" },
  { name: "Ian Andres González Mejia", doc: "1042256036", dob: "27/03/2008", gender: "M", sede: "SUR", height: "1.78", weight: "53.8", position: "Opuesto", eps: "Sanitas", playerPhone: "3013667425", parentName: "Mabel Esther González", parentPhone: "3013667425", parentEmail: "regaloian@gmail.com" },
  { name: "Isabella Sofia Morillo Ariza", doc: "1044222331", dob: "28/05/2012", gender: "F", sede: "NORTE", height: "1.60", weight: "47", position: "Punta", eps: "Sanitas", playerPhone: "3052897190", parentName: "Wendy Ariza", parentPhone: "3146797874", parentEmail: "wendyariza21@hotmail.com" },
  { name: "María Camila Polo Vega", doc: "1046704513", dob: "15/12/2008", gender: "F", sede: "SUR", height: "1.68", weight: "62", position: "Opuesto", eps: "Sura", playerPhone: "3006540468", parentName: "Anny Vega", parentPhone: "3008036702", parentEmail: "mariacamilapolovega@gmail.com" },
  { name: "Juan Jose Zapata Manga", doc: "1048074084", dob: "06/11/2009", gender: "M", sede: "NORTE", height: "1.82", weight: "62", position: "Central", eps: "Sura", playerPhone: "3102855763", parentName: "Ingrith Manga", parentPhone: "3013735828", parentEmail: "juanjosezapata118@gmail.com" },
  { name: "Mariana González Muñoz", doc: "1046706968", dob: "29/07/2010", gender: "F", sede: "NORTE", height: "1.50", weight: "55", position: "Armador", eps: "Sura", playerPhone: "3167068816", parentName: "Karen Muñoz Ponce", parentPhone: "3012413387", parentEmail: "Kmunozp@gmail.com" },
  { name: "Kiara Isabella Delgado González", doc: "1139433500", dob: "20/11/2011", gender: "F", sede: "NORTE", height: "1.65", weight: "69", position: "Punta", eps: "Mutual ser", playerPhone: "3194968834", parentName: "Paola González", parentPhone: "3012041646", parentEmail: "kiaraisabella2011@gmail.com" },
  { name: "Valerie Truyol", doc: "1146538015", dob: "22/06/2013", gender: "F", sede: "NORTE", height: "1.55", weight: "57", position: "Punta", eps: "Nueva EPS", playerPhone: "3004329494", parentName: "Berlys Castro", parentPhone: "3006304222", parentEmail: "berlys2108@gmail.com" },
  { name: "Gabriela García Santana", doc: "5283860174", dob: "16/10/2012", gender: "F", sede: "NORTE", height: "1.58", weight: "63.5", position: "Opuesto", eps: "Sanitas", playerPhone: "3007819895", parentName: "Clara Santana", parentPhone: "3045454517", parentEmail: "Gabrielaggarcia1118@gmail.com" },
  { name: "Danna Sofia Charry Cortes", doc: "1011204654", dob: "19/05/2010", gender: "F", sede: "SUR", height: "1.46", weight: "70", position: "Libero", eps: "Salud Total", playerPhone: "3177233279", parentName: "Eliana Cortes", parentPhone: "3156482076", parentEmail: "ecortes03@hotmail.com" },
  { name: "Isabela Florez Cortes", doc: "1028724025", dob: "25/09/2013", gender: "F", sede: "SUR", height: "1.39", weight: "38.9", position: "", eps: "Salud Total", playerPhone: "3126683046", parentName: "Jhonatan Florez", parentPhone: "3225123638", parentEmail: "jhonatan.florezb@hotmail.com" },
  { name: "Vittoria Anaya Navarro", doc: "1047053349", dob: "08/10/2012", gender: "F", sede: "NORTE", height: "1.54", weight: "50", position: "", eps: "Sanitas", playerPhone: "3243156476", parentName: "Nur Yijan Navarro", parentPhone: "3197690072", parentEmail: "Nur.navarro@gmail.com" },
  { name: "Lohana Saavedra Aguas", doc: "1041698536", dob: "19/10/2013", gender: "F", sede: "NORTE", height: "1.41", weight: "43", position: "", eps: "Nueva EPS", playerPhone: "3126683071", parentName: "Jennifer Aguas", parentPhone: "3126577439", parentEmail: "Jen_2305@hotmail.com" },
  { name: "Mariana Narvaez Navaja", doc: "1042853559", dob: "01/11/2015", gender: "F", sede: "NORTE", height: "1.47", weight: "50", position: "Central", eps: "Sura", playerPhone: "3052241039", parentName: "Neimi Navaja", parentPhone: "3052241039", parentEmail: "neimisayuri@gmail.com" },
  { name: "Angelina Duarte Londoño", doc: "1046718666", dob: "07/10/2013", gender: "F", sede: "NORTE", height: "1.50", weight: "73", position: "", eps: "Salud total", playerPhone: "3014798522", parentName: "Rosaura Londoño Orozco", parentPhone: "3014798522", parentEmail: "Rosura16@gmail.com" },
  { name: "Danna Sofía Vitola Chams", doc: "1942592544", dob: "15/02/2014", gender: "F", sede: "NORTE", height: "147", weight: "44", position: "Punta", eps: "Salud total", playerPhone: "3054567931", parentName: "Yesiree Chams", parentPhone: "3103859677", parentEmail: "yesichams08@gmail.com" },
  { name: "Ashleyoma Ariza", doc: "1041902951", dob: "27/01/2014", gender: "F", sede: "SUR", height: "1.70", weight: "55", position: "Punta", eps: "Sura", playerPhone: "3022336754", parentName: "Yomaira Ariza", parentPhone: "3136957425", parentEmail: "Judithariza_@hotmail.com" },
];

// ────────────────────────────────────────────────────────────
async function main() {
  console.log("🏐  Seeding Ball Breakers...\n");

  // 1. Club ────────────────────────────────────────────────
  const club = await db.club.upsert({
    where: { id: BB_ID },
    update: {
      billingCycleDay: 15,
      earlyPaymentDays: 5,
      earlyPaymentDiscount: 10000,
      zonePrices: { SUR: 80000, CENTRO: 90000, NORTE: 100000 },
    },
    create: {
      id: BB_ID,
      name: "Ball Breakers",
      slug: "ball-breakers",
      sport: "VOLLEYBALL",
      country: "CO",
      city: "Barranquilla",
      plan: "ENTERPRISE",
      billingCycleDay: 15,
      earlyPaymentDays: 5,
      earlyPaymentDiscount: 10000,
      zonePrices: { SUR: 80000, CENTRO: 90000, NORTE: 100000 },
    },
  });
  console.log(`✅ Club: ${club.name}\n`);

  // 2. Categories (M & F per age group) ───────────────────
  const CAT_DEFS = [
    { name: "Voley Kid F",  gender: "F", ageMin: 4,  ageMax: 9  },
    { name: "Voley Kid M",  gender: "M", ageMin: 4,  ageMax: 9  },
    { name: "Mini Voley F", gender: "F", ageMin: 10, ageMax: 12 },
    { name: "Mini Voley M", gender: "M", ageMin: 10, ageMax: 12 },
    { name: "Infantil F",   gender: "F", ageMin: 13, ageMax: 14 },
    { name: "Infantil M",   gender: "M", ageMin: 13, ageMax: 14 },
    { name: "Menores F",    gender: "F", ageMin: 15, ageMax: 17 },
    { name: "Menores M",    gender: "M", ageMin: 15, ageMax: 17 },
    { name: "Juvenil F",    gender: "F", ageMin: 18, ageMax: 21 },
    { name: "Juvenil M",    gender: "M", ageMin: 18, ageMax: 21 },
  ];

  const catMap: Record<string, string> = {};
  for (const c of CAT_DEFS) {
    const cat = await db.category.upsert({
      where: { name_clubId: { name: c.name, clubId: BB_ID } },
      update: { gender: c.gender, ageMin: c.ageMin, ageMax: c.ageMax },
      create: { clubId: BB_ID, name: c.name, gender: c.gender, ageMin: c.ageMin, ageMax: c.ageMax },
    });
    catMap[c.name] = cat.id;
  }
  console.log(`✅ ${CAT_DEFS.length} categorías creadas\n`);

  // Payment reference: cycle April 15 – May 14, 2026
  const cycleStart  = new Date("2026-04-15");
  const conceptLabel = "15 abr – 14 may 2026";

  let created = 0;

  // 3. Players + Parents ───────────────────────────────────
  for (const row of PLAYERS) {
    const emailDoc    = row.doc.toLowerCase();
    const playerEmail = `${emailDoc}@bb.internal`;
    const passwordHash = await hash(row.doc, 10);

    // Parse DOB
    const [dd, mm, yyyy] = row.dob.split("/");
    const dob = new Date(`${yyyy}-${mm}-${dd}`);

    const catName  = categoryName(dob, row.gender);
    const catId    = catMap[catName] ?? null;
    const amount   = monthlyAmount(row.sede);
    const h        = parseHeight(row.height);
    const w        = parseWeight(row.weight);
    const pos      = normPos(row.position);

    // ── Player User ────────────────────────────────────
    let playerUser = await db.user.findFirst({ where: { email: playerEmail } });
    if (!playerUser) {
      playerUser = await db.user.create({
        data: {
          clubId:   BB_ID,
          name:     row.name,
          email:    playerEmail,
          password: passwordHash,
          role:     "PLAYER",
          branch:   row.sede,
          eps:      row.eps || null,
          phone:    row.playerPhone || null,
        },
      });
    }

    // ── Player Profile ─────────────────────────────────
    let player = await db.player.findUnique({ where: { userId: playerUser.id } });
    if (!player) {
      player = await db.player.create({
        data: {
          clubId:         BB_ID,
          userId:         playerUser.id,
          categoryId:     catId,
          zone:           row.sede,
          dateOfBirth:    dob,
          documentNumber: row.doc,
          phone:          row.playerPhone || null,
          position:       pos,
          height:         h,
          weight:         w,
          gender:         row.gender,
          monthlyAmount:  amount,
          paymentDay:     15,
          status:         "ACTIVE",
        },
      });
    }

    // ── Payment: current cycle OVERDUE (due April 15, today April 27) ──
    const existingPmt = await db.payment.findFirst({
      where: { playerId: player.id, concept: { contains: conceptLabel } },
    });
    if (!existingPmt) {
      await db.payment.create({
        data: {
          clubId:   BB_ID,
          playerId: player.id,
          amount,
          concept:  `Mensualidad ${conceptLabel}`,
          status:   "OVERDUE",
          dueDate:  cycleStart,
        },
      });
    }

    // ── Parent User ────────────────────────────────────
    let parentEmail = row.parentEmail.trim();
    // Fix common email typos
    if (/^[^@]+@gmail$/.test(parentEmail)) parentEmail += ".com";
    if (!parentEmail.includes("@") || parentEmail.length < 5) {
      console.warn(`  ⚠  Sin email válido para tutor de ${row.name}`);
      console.log(`  ✓  ${row.name} → ${catName} [${row.sede}]`);
      created++;
      continue;
    }

    let parentUser = await db.user.findFirst({ where: { email: parentEmail } });
    if (!parentUser) {
      parentUser = await db.user.create({
        data: {
          clubId:   BB_ID,
          name:     row.parentName,
          email:    parentEmail,
          password: passwordHash, // password = player's doc
          role:     "PARENT",
          phone:    row.parentPhone || null,
        },
      });
    }

    // ── Parent Profile ─────────────────────────────────
    let parent = await db.parent.findUnique({ where: { userId: parentUser.id } });
    if (!parent) {
      parent = await db.parent.create({
        data: { userId: parentUser.id, phone: row.parentPhone || null },
      });
    }

    // ── Parent–Player Link ─────────────────────────────
    const linkExists = await db.parentPlayer.findFirst({
      where: { parentId: parent.id, playerId: player.id },
    });
    if (!linkExists) {
      await db.parentPlayer.create({
        data: { parentId: parent.id, playerId: player.id },
      });
    }

    console.log(`  ✓  ${row.name} → ${catName} [${row.sede}] $${amount.toLocaleString("es-CO")}`);
    created++;
  }

  console.log(`\n🎉 Listo: ${created}/${PLAYERS.length} deportistas creados en Ball Breakers.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
