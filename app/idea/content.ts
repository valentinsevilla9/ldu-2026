import type { LayerId } from "@/modules/sevilla/layers";

// Contenido de /idea, la presentación de la idea en una página. El día de la prueba se rellena
// aquí y en ningún otro sitio: cada texto entre corchetes es un hueco (`npm run docs:pending`
// los lista). Sigue los seis elementos que pide la organización, en su orden: problema,
// público destinatario, caso de uso y contexto urbano, solución tecnológica, prototipo con
// lógica simulada, y sostenibilidad y escalabilidad. Es lo mismo que cuentan el README y el
// one-pager, con las mismas cifras. El nombre del proyecto sale de lib/site.ts.

export type Stat = {
  value: string;
  description: string;
  /** Sin fuente, la cifra se presenta como «Hipótesis a validar». */
  source: { name: string; url: string } | null;
};

export type IdeaContent = {
  context?: {
    title: string;
    description: string;
    extension?: string;
    source: { name: string; url: string };
  }[];
  /** Lo que consigue el usuario, en una línea. */
  tagline: string;
  /** 1. Escena concreta: quién lo sufre, cuándo y qué le pasa, con un dato que lo respalde. */
  problem: { scene: string; stat: Stat };
  /** 2. Para quién es, qué necesita y qué le falla hoy; con su dato si lo hay. */
  audience: { who: string; need: string; stat: Stat | null };
  /** 3. Una persona concreta, en un lugar concreto de Sevilla y en un momento concreto. */
  useCase: { story: string; place: string; moment: string };
  /** 3. El contexto urbano, con un mapa de capas reales (modules/sevilla/layers.ts). */
  urbanContext: { description: string; layers: LayerId[] };
  /** 4. La solución tecnológica: una frase, cómo funciona y las decisiones técnicas. */
  solution: string;
  steps: { title: string; description: string }[];
  decisions: { decision: string; why: string; discarded: string }[];
  /** 5. Qué funciona de verdad y qué está simulado (y qué lo sustituiría en producción). */
  prototype: { works: string[]; simulated: string[] };
  /** 6. La respuesta en 3 líneas del one-pager: sostenible e inclusiva, escala, viable. */
  impact: { title: string; description: string }[];
  /** Pantalla principal de la aplicación y repositorio (null si no se enseña). */
  links: { app: string; repository: string | null };
};

const OPEN_METEO = {
  name: "Open-Meteo, reanálisis ERA5 (Copernicus), octubre de 2026",
  url: "https://open-meteo.com/",
};
const INE = {
  name: "INE, Atlas de distribución de renta de los hogares, 2023",
  url: "https://www.ine.es/",
};

export const IDEA: IdeaContent = {
  context: [
    {
      title: "Movilidad · Sevici",
      description:
        "La aplicación oficial ya muestra bicicletas y anclajes disponibles en tiempo real.",
      extension:
        "Ampliamos el recorrido con una regla de estación vacía durante 15 minutos y una solicitud de reposición para el operador. Este caso demuestra la reutilización del motor.",
      source: {
        name: "Sevici · Información oficial del servicio",
        url: "https://www.sevici.es/es/tutorial/groups?tab=RETURN",
      },
    },
    {
      title: "Residuos · Lipasam",
      description:
        "Lipasam ha probado sensores de llenado: su convenio con Ecourbes de 2022 contempló 20 dispositivos. Este antecedente no acredita su cobertura actual.",
      extension:
        "Llevamos la disponibilidad simulada a una decisión del vecino: dónde depositar su residuo según material, capacidad y distancia, o cuándo solicitar una recogida.",
      source: {
        name: "Lipasam · Convenios suscritos",
        url: "https://www.lipasam.es/transparencia/contratos-convenios-subvenciones/convenios-suscritos",
      },
    },
    {
      title: "Calor · Refugios climáticos",
      description:
        "En 2022, Sevilla anunció aperturas extraordinarias de tres centros cívicos como refugios ante episodios detectados por proMETEO.",
      extension:
        "Proponemos gestionar su disponibilidad efectiva: comprobar apertura y plazas, detectar falta de alternativas y solicitar la activación o ampliación de horario con confirmación humana.",
      source: {
        name: "Ayuntamiento de Sevilla · Aperturas extraordinarias, 2022",
        url: "https://www.sevilla.org/actualidad/noticias/2022/el-ayuntamiento-abrira-tres-centros-civicos-de-zonas-vulnerables-las-tardes-del-lunes-y-martes-de-la-proxima-semana-como-refugios-climaticos-ante-una-nueva-ola-de-calor-con-riesgo-para-la-salud-detectada-por-el-proyecto-prometeo",
      },
    },
  ],
  tagline: "Del dato a la acción, en tu barrio: recursos disponibles y actuaciones explicables.",
  problem: {
    scene:
      "Durante un episodio de calor, tener una biblioteca o un centro cívico cerca no garantiza que esté habilitado como refugio, abierto o con plazas. El reto está en convertir información urbana en una alternativa utilizable y una respuesta coordinada cuando esa alternativa falta. La magnitud de esta falta de cobertura en Triana y el impacto del piloto son hipótesis a validar.",
    stat: {
      value: "×3,5",
      description:
        "Los días de 40 °C o más en Sevilla pasan de 3,5 al año (2000-2009) a 12,3 (2016-2025); en 2025 hubo 18.",
      source: OPEN_METEO,
    },
  },
  audience: {
    who: "Personal municipal que coordina la respuesta al calor en Triana y responsables de equipamientos. La ciudadanía utiliza la app; los operadores de Lipasam y Sevici gestionan las actuaciones de sus servicios.",
    need: "Dos necesidades: el vecino busca dónde acudir; el responsable necesita saber dónde intervenir y qué actuación confirmar.",
    stat: {
      value: "25,7 %",
      description:
        "de la población de Triana tiene 65 años o más, y el 33,6 % de los hogares son de una sola persona.",
      source: INE,
    },
  },
  useCase: {
    story:
      "A las 14:30, una vecina cerca de la calle Pureza busca dónde resguardarse. En el escenario de calor, consulta la app: si no hay un espacio disponible dentro de la distancia elegida, registra una solicitud. La técnica confirma la apertura en Gestión y, al volver a consultar, la vecina ya encuentra una alternativa. La escena y la disponibilidad son simuladas sobre lugares reales.",
    place:
      "Distrito Triana: 68 paradas de TUSSAM, 31 estaciones de Sevici y 33 puntos de reciclaje",
    moment:
      "Escena ilustrativa a las 14:30 de un día de verano; simulación anclada al histórico del 12 de agosto de 2025",
  },
  urbanContext: {
    description:
      "El piloto relaciona los puntos donde se simulan incidencias con servicios y equipamientos de Triana. Las ubicaciones municipales proceden del Centro de Datos Urbanos; el reciclaje, de OpenStreetMap. El mapa permite explorar esa distribución, no evaluar riesgo térmico ni acreditar refugios disponibles.",
    layers: [
      "distritos",
      "tussam-paradas",
      "sevici",
      "reciclaje",
      "bibliotecas",
      "centros-civicos",
    ],
  },
  solution:
    "Una app para consultar alternativas disponibles y un panel municipal para configurar reglas y confirmar actuaciones. El motor detecta incidencias; un agente simulado consulta recursos y propone respuestas validadas.",
  steps: [
    {
      title: "Mide",
      description:
        "Cada sensor envía su lectura; en el prototipo, simulada sobre puntos reales del distrito.",
    },
    {
      title: "Decide",
      description:
        "El motor evalúa cada regla: umbral, duración mínima, franja horaria y espera entre avisos.",
    },
    {
      title: "Actúa",
      description:
        "El agente simulado comprueba apertura, plazas, material, horario y distancia. El responsable confirma la actuación y cambia la disponibilidad del piloto.",
    },
  ],
  decisions: [
    {
      decision: "Reglas con duración, franja horaria y un aviso por episodio",
      why: "Un pico suelto no es una emergencia y la misma alarma repetida acaba ignorada.",
      discarded:
        "Umbral simple por lectura (lluvia de avisos) y aprendizaje automático (sin datos para entrenarlo y nada explicable).",
    },
    {
      decision: "Temperatura anclada a un día real de Open-Meteo",
      why: "La simulación parte de un dato con fuente: 43,8 °C de máxima y 27,4 °C de mínima.",
      discarded: "Valores aleatorios: no aguantan la pregunta «¿de dónde sale?».",
    },
    {
      decision: "Recomendar solo alternativas que cumplen condiciones",
      why: "El punto más cercano no sirve si está cerrado, lleno o no admite el residuo.",
      discarded:
        "Mapa estático con el más cercano: es el escenario base con el que se compara la métrica.",
    },
  ],
  prototype: {
    works: [
      "Motor de reglas real (con tests) y reglas guardadas en base de datos: crear, editar, pausar y borrar.",
      "Puntos reales: paradas de TUSSAM, Sevici, reciclaje, bibliotecas y centros cívicos del Ayuntamiento y OpenStreetMap.",
      "Recomendaciones con restricciones; solicitudes y actuaciones persistidas por sesión y minuto; apertura, recogida y reposición cambian el estado simulado.",
      "Métrica reproducible: porcentaje de solicitudes con alternativa válida frente a la opción más cercana sin consultar disponibilidad. Mismo conjunto, minuto y distancia; no representa impacto real.",
    ],
    simulated: [
      "Las lecturas de los sensores: la temperatura sigue la curva del 12 de agosto de 2025 más un recargo de calle de 0 a 3 °C (hipótesis a validar). En producción, sensores reales enviando por LoRaWAN o NB-IoT.",
      "Lecturas, horarios, capacidad y habilitación de refugios ficticios. Umbrales, recargo de calle y disponibilidad: hipótesis a validar. Distancias en línea recta, no rutas accesibles.",
      "Agente de planificación simulado basado en reglas; no hay modelo de IA conectado. Su secuencia de herramientas es visible. Las actuaciones no se ejecutan fuera de la demo.",
    ],
  },
  impact: [
    {
      title: "Sostenible e inclusiva",
      description:
        "Busca facilitar el acceso a recursos, especialmente a personas mayores, y reducir desplazamientos a sitios cerrados o llenos. Teclado, etiquetas y tablas alternativas acompañan la información visual. El impacto real se validaría en un piloto.",
    },
    {
      title: "Escala",
      description:
        "Otro distrito u otra ciudad es cambiar el polígono y las capas; una regla nueva es una fila en la base de datos, no código.",
    },
    {
      title: "Viable a largo plazo",
      description:
        "Modelo propuesto: implantación y licencia anual con soporte para ayuntamientos u operadores. Sensores e integraciones aparte. Precio, ahorro y disposición a pagar: hipótesis a validar. Producción requiere acuerdos de datos, autenticación y validación de protocolos.",
    },
  ],
  links: { app: "/app", repository: null },
};
