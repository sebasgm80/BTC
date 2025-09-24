import { memo } from 'react';

export const TerminosPage = memo(() => (
  <section className="terminos" aria-labelledby="terminos-heading">
    <h2 id="terminos-heading">Términos de uso y limitaciones</h2>
    <p>
      Esta calculadora ofrece estimaciones orientativas basadas en los datos introducidos por la persona usuaria. No es una
      herramienta de asesoramiento financiero ni garantiza resultados futuros.
    </p>
    <h3>Responsabilidad</h3>
    <p>
      Cada decisión de inversión, retiro o custodia corresponde a la persona usuaria. La web no asume responsabilidad por las
      pérdidas derivadas del uso de la herramienta o por interpretaciones erróneas de los cálculos mostrados.
    </p>
    <h3>Datos y privacidad</h3>
    <p>
      Los valores introducidos se almacenan únicamente en tu navegador mediante <em>localStorage</em> para que puedas
      recuperarlos en futuras visitas. No se envían a servidores externos ni se comparten con terceros.
    </p>
    <h3>Limitaciones de mercado</h3>
    <p>
      El precio del bitcoin se consulta en APIs públicas que pueden dejar de estar disponibles en cualquier momento. Si las
      fuentes fallan, verás un aviso y deberás introducir manualmente tus supuestos.
    </p>
    <h3>Uso adecuado</h3>
    <p>
      Evita compartir capturas de pantalla o exportaciones CSV con datos sensibles. Antes de tomar decisiones económicas,
      contrasta la información con fuentes oficiales y asesórate de forma independiente.
    </p>
  </section>
));

TerminosPage.displayName = 'TerminosPage';
