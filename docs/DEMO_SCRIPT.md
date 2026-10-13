# Guion de demo: Sevilla Activa

| Tiempo    | Qué digo | Qué se ve en pantalla |
| --------- | -------- | --------------------- |
| 0:00-0:20 | **Problema.** «Cuando hace 40 °C, tener una biblioteca cerca no significa que esté abierta, habilitada o con sitio.» «Los días de 40 °C en Sevilla han pasado de 3,5 a 12,3 al año, según Open-Meteo.» | `/idea`, el problema con el dato y su fuente. |
| 0:20-0:40 | **Público y caso de uso.** «Es para quien coordina la respuesta al calor en Triana y para los vecinos. Por ejemplo, una vecina cerca de la calle Pureza a las 14:30 de un día como el 12 de agosto de 2025.» «En Triana, uno de cada cuatro vecinos tiene 65 años o más.» | `/idea`, el caso de uso y el mapa del contexto urbano. |
| 0:40-1:50 | **Prototipo.** «Sevilla Activa convierte la lectura de un sensor en una alternativa o en una tarea.» 1) «Reproduzco el día: a las 12:30 las paradas pasan de 40 °C durante media hora.» 2) «La regla se dispara y la app busca un refugio habilitado, abierto y con capacidad; si no hay, pide activarlo.» 3) «El responsable lo atiende y el estado cambia.» Y: «Las lecturas y la capacidad de los refugios están simuladas; en producción, sensores reales y la confirmación de cada equipamiento.» | `/en-vivo` (Reproducir, «Ir a las 14:30»), `/alertas`, `/reglas`. Si da tiempo, en el móvil. |
| 1:50-2:20 | **Solución tecnológica.** «El motor solo dispara si la condición dura el tiempo pedido en su franja, y avisa una vez por episodio: un pico no es una emergencia.» «Usa datos reales del Ayuntamiento, OpenStreetMap, INE y Open-Meteo, funciona sin internet y tiene [N] tests.» Métrica: «[X] % de solicitudes con alternativa válida frente a [Y] % del mapa estático.» | El diagrama de arquitectura del README y la métrica. |
| 2:20-2:45 | **Sostenibilidad y escala.** «Incluye a mayores que viven solos; otro distrito es otro polígono, no otro código; lo sostendría el Ayuntamiento con servicios que ya tiene.» | `/idea`, sostenibilidad y escalabilidad. |
| 2:45-3:00 | **Cierre.** La frase de cierre, mirando al jurado. | La URL pública en grande. |

**Frase de cierre:** «Sevilla Activa ya funciona hoy con ubicaciones reales de Triana. Con
sensores en la calle y la confirmación de los refugios, ninguna vecina caminaría al sol hacia
un sitio cerrado.»

**Si no hay exposición oral:** `/idea` y el README cuentan lo mismo sin ti delante. Deja
`/idea` abierta y la URL pública visible, y comprueba que `npm run docs:pending` no deja huecos.

## Dos minutos antes

- [ ] Pestañas abiertas en orden: `/idea`, `/en-vivo`, `/alertas`.
- [ ] La demo, en la URL pública y en el móvil con datos móviles (no la wifi de la sede).
- [ ] Reglas cargadas (`npm run seed` si hace falta) y reloj en las 12:00.
- [ ] Zoom del navegador al 125 %, modo «no molestar», notificaciones y pestañas personales
      cerradas.
- [ ] Plan B probado: `npm run serve:lan` o `npm run dev:offline` (ver docs/DEPLOY.md).

## Si algo falla en directo

No se depura delante del jurado: se dice una frase y se sigue con el guion.

| Qué pasa           | Qué digo                                                        | Qué hago                                     |
| ------------------ | --------------------------------------------------------------- | -------------------------------------------- |
| No hay internet    | «Por eso la preparé para funcionar sin red.»                    | `npm run serve:lan` o `npm run dev:offline`. |
| El mapa base no carga | «Sin red el fondo queda gris, pero los sensores siguen ahí.» | Seguir; la tabla de lecturas va debajo.      |
| Una pantalla falla | «Es una prueba de concepto; os enseño ese paso con la captura.» | Abrir la captura de `docs/screenshots/`.     |

## Preguntas probables

| Pregunta                             | Respuesta preparada |
| ------------------------------------ | ------------------- |
| ¿Cómo escala? ¿Es sostenible?        | Las 3 líneas del bloque «Sostenibilidad y escalabilidad» del one-pager. |
| ¿Qué tiene de nuevo?                 | El motor de reglas: duración, franja horaria, un aviso por episodio y espera entre avisos. Descarté el umbral simple (lluvia de avisos) y el aprendizaje automático (sin datos y no explicable). |
| ¿Qué es real y qué está simulado?    | Reales: ubicaciones del Ayuntamiento y OpenStreetMap, población del INE, temperatura del 12 de agosto de 2025 (Open-Meteo), lógica e interfaz. Simulados: lecturas, recargo de calle de 0 a 3 °C, habilitación y capacidad de refugios y actuaciones. |
| ¿De dónde sale ese dato?             | Open-Meteo (ERA5, octubre de 2026) e INE (Atlas de renta, 2023); enlazados en el README. |
| ¿Qué hiciste hoy y qué traías hecho? | La base (interfaz, API, mapa y despliegue) es una plantilla propia preparada antes; hoy: motor de reglas, simulador anclado al día real, recomendaciones, métrica y las pantallas del reto. |
| ¿Qué pasa con la privacidad?         | No guarda datos personales: solo reglas y actuaciones. Los sensores miden el entorno, no a personas. |
| ¿Cuánto cuesta mantenerlo?           | El alojamiento estándar (Vercel y Postgres gestionado); sin IA no hay coste por uso. Los sensores, hipótesis a validar. |
| ¿Qué harías con una semana más?      | Validar refugios con el distrito, conectar Sevici en tiempo real y un asistente que redacte la solicitud de activación. |
