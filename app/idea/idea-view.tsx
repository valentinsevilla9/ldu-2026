import Link from "next/link";
import { ArrowRightIcon, CircleCheckIcon, ExternalLinkIcon, FlaskConicalIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { findContentHoles } from "@/lib/placeholders";
import { cn } from "@/lib/utils";
import { ContextMap } from "./context-map";
import { Architecture } from "./architecture";
import type { IdeaContent, Stat } from "./content";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6">
      <h2 id={id} className="text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function CallToAction({ links }: { links: IdeaContent["links"] }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button asChild size="lg">
        <Link href={links.app}>
          Probar la aplicación
          <ArrowRightIcon aria-hidden="true" />
        </Link>
      </Button>
      {links.repository && (
        <Button asChild size="lg" variant="outline">
          <a href={links.repository} target="_blank" rel="noreferrer">
            Ver el código
            <ExternalLinkIcon aria-hidden="true" />{" "}
            <span className="sr-only">(se abre en una pestaña nueva)</span>
          </a>
        </Button>
      )}
    </div>
  );
}

/** A figure with its source, or marked as a hypothesis when there is none. */
function StatCard({ stat }: { stat: Stat }) {
  return (
    <Card>
      <CardContent>
        <figure className="flex flex-col gap-2">
          <p className="text-5xl font-semibold tracking-tight tabular-nums">{stat.value}</p>
          <p className="text-base">{stat.description}</p>
          <figcaption className="text-sm text-muted-foreground">
            {stat.source ? (
              <>
                Fuente:{" "}
                <a
                  href={stat.source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  {stat.source.name} <span className="sr-only">(se abre en una pestaña nueva)</span>
                </a>
              </>
            ) : (
              <Badge variant="outline">Hipótesis a validar</Badge>
            )}
          </figcaption>
        </figure>
      </CardContent>
    </Card>
  );
}

/**
 * Presentación de la idea en una página, con los seis elementos que pide la organización y
 * en su orden: problema, público destinatario, caso de uso y contexto urbano (con un mapa de
 * datos reales de Sevilla), solución tecnológica, prototipo (qué funciona y qué está
 * simulado), y sostenibilidad y escalabilidad. Todo el texto viene de `content`; con
 * `showHoles`, avisa de los huecos sin rellenar (la página lo activa solo en desarrollo).
 */
export function IdeaView({
  name,
  content,
  showHoles = false,
}: {
  name: string;
  content: IdeaContent;
  showHoles?: boolean;
}) {
  const holes = showHoles ? findContentHoles(content) : [];
  const { audience, useCase, urbanContext, prototype } = content;

  return (
    <article className="flex flex-col gap-14">
      {holes.length > 0 && (
        <p role="note" className="rounded-md border border-dashed px-4 py-3 text-sm">
          Faltan {holes.length} huecos por rellenar en <code>app/idea/content.ts</code> (
          <code>npm run docs:pending</code> los lista). Este aviso solo aparece en desarrollo.
        </p>
      )}

      <header className="flex flex-col gap-4">
        <p className="text-sm font-medium text-muted-foreground">Sevilla Activa · Piloto urbano</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{name}</h1>
        <p className="max-w-3xl text-xl text-muted-foreground">{content.tagline}</p>
        <CallToAction links={content.links} />
      </header>

      <Section id="idea-reto" title="El reto #48">
        <p className="max-w-3xl text-lg leading-8">
          Diseñar una app que muestre lecturas IoT en tiempo real simulado y dispare reglas
          automáticas: «si ocurre X, entonces Y».
        </p>
        <p className="text-sm text-muted-foreground">
          Innovación e IoT · Líderes Digitales Universitarios 2026 · Piloto en Triana, Sevilla
        </p>
      </Section>

      <Section id="idea-problema" title="El problema">
        <div className="grid gap-6 md:grid-cols-[3fr_2fr] md:items-start">
          <p className="text-lg leading-8">{content.problem.scene}</p>
          <StatCard stat={content.problem.stat} />
        </div>
      </Section>

      <Section id="idea-publico" title="Público destinatario">
        <div className="grid gap-6 md:grid-cols-[3fr_2fr] md:items-start">
          <div className="flex flex-col gap-3">
            <p className="text-lg leading-8">{audience.who}</p>
            <p className="text-muted-foreground">{audience.need}</p>
          </div>
          {audience.stat && <StatCard stat={audience.stat} />}
        </div>
      </Section>

      <Section id="idea-solucion" title="Solución tecnológica">
        <p className="max-w-3xl text-2xl leading-10 font-medium">{content.solution}</p>
      </Section>

      {content.context && content.context.length > 0 && (
        <Section id="idea-contexto" title="Qué existe ya en Sevilla">
          <ul className="grid gap-4 md:grid-cols-3">
            {content.context.map((item) => (
              <li key={item.source.url}>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>
                      <h3 className="text-base">{item.title}</h3>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <p>{item.description}</p>
                    {item.extension && (
                      <p className="border-t pt-3 text-sm">
                        <strong>Cómo lo ampliamos:</strong> {item.extension}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section id="idea-caso" title="Un caso concreto en Triana">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <p className="text-lg leading-8">{useCase.story}</p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium">Dónde</dt>
                <dd className="text-muted-foreground">{useCase.place}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium">Cuándo</dt>
                <dd className="text-muted-foreground">{useCase.moment}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <h3 className="text-lg font-semibold">Contexto urbano y mapa del piloto</h3>
        <p className="max-w-3xl">{urbanContext.description}</p>
        {urbanContext.layers.length > 0 && <ContextMap initial={urbanContext.layers} />}
      </Section>

      <Section id="idea-arquitectura" title="Arquitectura de la aplicación">
        <Architecture />
      </Section>

      <Section id="idea-agente" title="El agente IA: qué hay implementado">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Badge variant="outline" className="w-fit">
              Planificador simulado · sin modelo de IA conectado
            </Badge>
            <p>
              Hoy está implementado un planificador determinista en TypeScript: recibe la solicitud,
              consulta recursos próximos, comprueba sus condiciones y devuelve una propuesta
              estructurada con su explicación.
            </p>
            <p className="text-sm text-muted-foreground">
              El motor de reglas detecta incidencias. El planificador busca alternativas cuando el
              vecino consulta la app; no diagnostica riesgos de salud ni ejecuta actuaciones
              municipales por sí solo.
            </p>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border p-5">
            <h3 className="font-semibold">Herramientas y límites</h3>
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              <li>Consultar recursos dentro de la distancia elegida.</li>
              <li>Comprobar apertura y plazas, material y llenado, o bicicletas disponibles.</li>
              <li>Validar la alternativa o preparar una solicitud de actuación.</li>
            </ol>
            <p className="text-sm text-muted-foreground">
              Para incorporar IA real falta conectar un modelo a estas herramientas, validar sus
              propuestas y evaluar errores y coste. Mantendríamos las restricciones del servidor, la
              confirmación humana y el planificador actual como alternativa si falla.
            </p>
          </div>
        </div>
      </Section>

      <Section id="idea-funcionamiento" title="Cómo funciona y decisiones técnicas">
        <ol
          aria-label="Cómo funciona"
          className={cn(
            "grid gap-4 sm:grid-cols-2",
            content.steps.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
          )}
        >
          {content.steps.map((step, index) => (
            <li key={index}>
              <Card className="h-full">
                <CardHeader>
                  <span
                    aria-hidden="true"
                    className="flex size-8 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground"
                  >
                    {index + 1}
                  </span>
                  <CardTitle>
                    <h4 className="text-base">{step.title}</h4>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>

        <h3 className="text-lg font-semibold">Decisiones técnicas</h3>
        <ul className="grid gap-4 md:grid-cols-3">
          {content.decisions.map((item, index) => (
            <li key={index}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>
                    <h4 className="text-base">{item.decision}</h4>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="flex flex-col gap-3">
                    <div>
                      <dt className="text-sm font-medium">Por qué</dt>
                      <dd className="text-muted-foreground">{item.why}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium">Qué se descartó</dt>
                      <dd className="text-muted-foreground">{item.discarded}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="idea-prototipo" title="Prototipo">
        <div className="grid gap-6 md:grid-cols-2">
          {[
            { title: "Funciona", items: prototype.works, Icon: CircleCheckIcon },
            { title: "Simulado", items: prototype.simulated, Icon: FlaskConicalIcon },
          ].map(({ title, items, Icon }) => (
            <div key={title} className="flex flex-col gap-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <Icon aria-hidden="true" className="size-5" />
                {title}
              </h3>
              <ul className="flex list-disc flex-col gap-2 pl-5">
                {items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section id="idea-impacto" title="Sostenibilidad y escalabilidad">
        <ul className="grid gap-4 md:grid-cols-3">
          {content.impact.map((item, index) => (
            <li key={index} className="flex flex-col gap-1 border-l-4 border-primary pl-4">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-muted-foreground">{item.description}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="idea-fuentes" title="Fuentes y antecedentes">
        <p className="text-sm text-muted-foreground">
          Las cifras mantienen su fuente junto al dato. Los antecedentes institucionales se reúnen
          aquí; las lecturas y actuaciones del piloto son simuladas.
        </p>
        <ul className="flex flex-col gap-2 text-sm">
          {content.context?.map((item) => (
            <li key={item.source.url}>
              <a
                href={item.source.url}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                {item.source.name}
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
              </a>
            </li>
          ))}
          <li>
            <a
              href="https://cda-idesevilla.opendata.arcgis.com/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              Ayuntamiento · Centro de Datos Urbanos
              <span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
          </li>
          <li>
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              Colaboradores de OpenStreetMap · ODbL
              <span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
          </li>
        </ul>
      </Section>

      <footer className="flex flex-col gap-4 rounded-xl bg-muted/50 p-6">
        <p className="text-lg font-medium">
          Prueba el recorrido del vecino y las actuaciones del piloto.
        </p>
        <CallToAction links={content.links} />
      </footer>
    </article>
  );
}
