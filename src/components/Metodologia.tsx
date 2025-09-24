import { memo } from 'react';

const exampleWallet = 1.2;
const exampleProtected = 0.3;
const exampleWithdrawable = Math.max(0, exampleWallet - exampleProtected);
const examplePeriods = 12;
const examplePerPeriod = exampleWithdrawable / examplePeriods;
const examplePrice = 65000;

export const Metodologia = memo(() => (
  <section className="metodologia" aria-labelledby="metodologia-heading">
    <h2 id="metodologia-heading">Metodología y supuestos</h2>
    <details>
      <summary>Cómo estimamos los retiros periódicos</summary>
      <div className="metodologia__content">
        <p>
          Calculamos el ritmo de retiros suponiendo que repartirás tus BTC retirables a partes iguales entre el número de
          periodos que transcurren hasta la fecha final indicada. Este enfoque no constituye asesoramiento financiero y debes
          revisar siempre tus propios supuestos.
        </p>
        <ul>
          <li>
            <code>btc_retirable = max(0, walletBTC - btcIntocable)</code>
          </li>
          <li>
            <code>periodos = nº de meses/semanas hasta fechaFinal</code>
          </li>
          <li>
            <code>retiroPorPeriodoBTC = btc_retirable / periodos</code>
          </li>
          <li>
            Conversión a euros aplicando el precio actual y el proyectado si defines una variación.
          </li>
        </ul>
        <p>
          <strong>Ejemplo:</strong> con una cartera de {exampleWallet.toFixed(2)} BTC y {exampleProtected.toFixed(2)} BTC protegidos, puedes retirar{' '}
          {exampleWithdrawable.toFixed(2)} BTC. Si restan {examplePeriods} periodos, retirarías {examplePerPeriod.toFixed(4)} BTC cada vez. Con un
          precio estimado de €{examplePrice.toLocaleString('es-ES')}, eso supone aproximadamente €{(examplePerPeriod * examplePrice).toLocaleString(
            'es-ES',
            { maximumFractionDigits: 2 }
          )}{' '}
          por periodo.
        </p>
        <p className="help">
          Ajusta la frecuencia y la fecha final para adaptar estos cálculos a tu contexto personal.
        </p>
      </div>
    </details>
  </section>
));

Metodologia.displayName = 'Metodologia';
