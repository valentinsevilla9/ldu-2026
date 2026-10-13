# Sevilla Activa

**Del dato a la acción, en tu barrio: cuando un sensor detecta un problema, la ciudad sabe qué
alternativa ofrecer y a quién pedir que actúe.**

[URL pública] · Reto #48: lecturas IoT en tiempo real (simuladas) y reglas automáticas «si X
entonces Y» · [Nombre y apellidos], Universidad de Sevilla

**Problema.** En un episodio de calor, tener un equipamiento cerca no garantiza que esté
habilitado como refugio, abierto o con sitio; igual con un contenedor lleno o una estación de
Sevici vacía. Los días de 40 °C o más en Sevilla han pasado de 3,5 al año (2000-2009) a 12,3
(2016-2025), según Open-Meteo (ERA5). Hipótesis a validar: que falte cobertura de refugios
disponibles en Triana en las horas de más calor.

**Público destinatario.** El personal municipal que coordina la respuesta al calor en Triana
y los responsables de los equipamientos; de rebote, los vecinos que buscan una alternativa y
los operadores de Sevici y Lipasam.

**Caso de uso y contexto urbano.** A las 14:30 de un día como el 12 de agosto de 2025 (43,8
°C), una vecina cerca de la calle Pureza busca refugio. Las paradas de su zona pasan de 40 °C
durante 30 minutos; Sevilla Activa recomienda un refugio habilitado, abierto y con capacidad
o, si no lo hay, pide al responsable que lo active. En Triana, el 25,7 % de la población tiene
65 años o más (INE, 2023).

**Solución tecnológica.** Sensores sobre 132 puntos reales de Triana (paradas, Sevici,
reciclaje) y un motor de reglas que convierte cada lectura en una alternativa para el vecino o
en una tarea para el responsable. Next.js, TypeScript, Prisma y datos abiertos del
Ayuntamiento, OpenStreetMap, INE y Open-Meteo.

## Innovación técnica · 20 puntos

- **Tecnología de vanguardia (1).** IoT simulado sobre ubicaciones reales y reglas en tiempo
  real; recomendaciones que comprueban disponibilidad, compatibilidad y distancia, no solo
  cercanía.
- **Robustez (2).** [N] tests automáticos, validación con zod en cliente y servidor, errores
  claros en español, funciona en móvil y sin internet (plan B local).
- **Lo nuevo (3).** El motor de reglas: dispara solo si la condición dura el tiempo pedido en
  su franja horaria, una vez por episodio y con espera entre avisos, para que un pico no sea
  una emergencia ni la alarma se ignore.
- **Resuelve el problema (4).** En la demo, la regla de calor salta a las 12:30, la app
  propone un refugio disponible o genera la solicitud, y el responsable la marca como atendida.

## Prueba de concepto · 15 puntos

- **Prototipo funcional (5).** En la URL: reloj del día simulado, mapa en vivo, reglas
  editables y alertas con su acción. Simulados: lecturas, habilitación y capacidad de refugios
  y actuaciones; en producción, sensores LoRaWAN o NB-IoT y confirmación de cada equipamiento.
- **Valida la idea (6).** Métrica reproducible: solicitudes resueltas con una alternativa
  válida, **Sevilla Activa [X] % frente a [Y] %** del mapa estático que recomienda el más
  cercano sin mirar su estado ([N] solicitudes del día simulado).
- **Camino a producto (7).** Faltan los sensores reales y la confirmación de los refugios por
  sus responsables; la API, la base de datos (Postgres con solo cambiar una variable) y el
  despliegue ya están.

## Sostenibilidad y escalabilidad · 15 puntos

1. **Es sostenible e inclusiva (8)** porque está pensada para mayores que viven solos (33,6 %
   de los hogares de Triana son unipersonales) y evita desplazamientos inútiles a refugios
   cerrados o puntos llenos; la accesibilidad está comprobada con teclado, foco visible,
   estados con icono y texto y tabla equivalente al mapa.
2. **Escala (9):** hoy evalúa 132 sensores en menos de 0,2 s por consulta; para 100 veces más
   basta con Postgres y el escalado automático de Vercel, y llevarla a otro distrito o ciudad
   es cambiar el polígono y las capas, no el código.
3. **Es viable a largo plazo (10):** el software cuesta lo que un alojamiento estándar y lo
   sostendría el Ayuntamiento, que ya opera Sevici, Lipasam y los centros cívicos; el coste de
   los sensores es hipótesis a validar. Tecnología estándar y mantenida.
