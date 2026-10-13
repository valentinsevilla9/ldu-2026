import { z } from "zod";

// zod con mensajes en español por defecto. Los esquemas importan `z` desde aquí, así
// cualquier error sin mensaje propio (tipo incorrecto, campo ausente…) sale en español.
z.config(z.locales.es());

export { z };
