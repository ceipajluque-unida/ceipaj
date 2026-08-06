import { useEffect, useState } from 'react';
import { Button, Input, InputNumber, Select, Switch } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { avisarError, avisarExito, toast } from '../servicios/avisos.js';
import { contar, conMiles, sinMiles } from '../servicios/formato.js';
import FondoIngreso from '../componentes/FondoIngreso.jsx';
import { useTema } from '../contextos/tema.jsx';

function generarClave() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export default function Configuracion() {
  const { previsualizar } = useTema();
  const [config, setConfig] = useState(null);
  const [valores, setValores] = useState({});
  const [sucios, setSucios] = useState(new Set());
  const [pestana, setPestana] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [destinoCorreo, setDestinoCorreo] = useState('');
  const [destinoSms, setDestinoSms] = useState('');
  const [enviando, setEnviando] = useState(null);

  async function cargar() {
    const datos = await llamarApi('/api/configuracion');
    setConfig(datos);

    const iniciales = {};
    datos.forEach((grupo) => grupo.ajustes.forEach((a) => { iniciales[a.clave] = a.tipo === 'secreto' ? '' : (a.valor ?? ''); }));
    setValores(iniciales);
    setSucios(new Set());
  }
  useEffect(() => { cargar().catch((e) => avisarError(e.message)); }, []);

  function editar(clave, valor) {
    setValores((previo) => ({ ...previo, [clave]: valor }));
    setSucios((previo) => new Set(previo).add(clave));

    if (clave === 'COLOR_ACENTO') previsualizar(valor);
  }

  async function guardar() {
    const cambios = {};
    sucios.forEach((clave) => { cambios[clave] = valores[clave]; });
    if (Object.keys(cambios).length === 0) return toast('No hay cambios para guardar.', 'info');
    setGuardando(true);
    try {
      await llamarApi('/api/configuracion', { metodo: 'PUT', cuerpo: { cambios } });
      await cargar();

      window.dispatchEvent(new Event('institucion'));
      toast('Configuración guardada.');
    } catch (excepcion) {
      avisarError(excepcion.message);
    } finally {
      setGuardando(false);
    }
  }

  async function probar(ruta, destino) {
    if (!String(destino ?? '').trim()) return avisarError('Escribí un correo o número de destino para la prueba.');
    setEnviando(ruta);
    try {
      await llamarApi(`/api/configuracion/${ruta}`, { metodo: 'POST', cuerpo: { para: destino.trim() } });
      avisarExito('Enviado correctamente. Revisá la bandeja o el teléfono de destino.');
    } catch (excepcion) {
      avisarError(excepcion.message);
    } finally {
      setEnviando(null);
    }
  }

  if (!config) return <p className="mensaje-centrado">Cargando…</p>;

  const entrada = (ajuste) => {
    const valor = valores[ajuste.clave] ?? '';
    if (ajuste.tipo === 'opcion') {
      return (
        <Select
          value={valor}
          options={ajuste.opciones.map((op) => ({ value: op.valor, label: op.texto }))}
          onChange={(elegido) => editar(ajuste.clave, elegido)}
        />
      );
    }
    if (ajuste.tipo === 'booleano') {
      return (
        <span className="casilla">
          <Switch
            checked={valor === '1'}
            onChange={(marcado) => editar(ajuste.clave, marcado ? '1' : '0')}
            aria-label={ajuste.etiqueta}
          />
          <span className="nota">{valor === '1' ? 'Sí' : 'No'}</span>
        </span>
      );
    }
    if (ajuste.tipo === 'parrafo' || ajuste.tipo === 'documento') {
      return (
        <Input.TextArea
          value={valor}
          rows={ajuste.tipo === 'documento' ? 16 : 3}
          onChange={(e) => editar(ajuste.clave, e.target.value)}
        />
      );
    }
    if (ajuste.tipo === 'secreto') {
      const campo = (
        <Input.Password value={valor} placeholder={ajuste.configurado ? 'Ya configurado' : 'Sin configurar'} onChange={(e) => editar(ajuste.clave, e.target.value)} />
      );
      if (!ajuste.generable) return campo;
      return (
        <div className="campo-con-boton">
          {campo}
          <Button onClick={() => editar(ajuste.clave, generarClave())}>Generar</Button>
        </div>
      );
    }
    if (ajuste.tipo === 'numero') {
      return (
        <InputNumber
          style={{ width: '100%' }}
          value={valor}
          min={ajuste.min}
          max={ajuste.max}
          prefix={ajuste.moneda ? "Gs." : undefined}
          formatter={ajuste.moneda ? conMiles : undefined}
          parser={ajuste.moneda ? sinMiles : undefined}
          onChange={(numero) => editar(ajuste.clave, numero === null || numero === undefined ? '' : String(numero))}
        />
      );
    }
    return <Input value={valor} onChange={(e) => editar(ajuste.clave, e.target.value)} />;
  };

  const seMuestra = (ajuste) => !ajuste.depende || valores[ajuste.depende.clave] === ajuste.depende.valor;

  const grupo = config[pestana];
  const pendientes = sucios.size;

  return (
    <>
      <header className="encabezado-pagina">
        <h2>Configuración del sistema</h2>
        <Button type="primary" onClick={guardar} disabled={guardando || pendientes === 0}>
          {guardando ? 'Guardando…' : pendientes > 0 ? `Guardar ${contar(pendientes, 'cambio', 'cambios')}` : 'Guardar cambios'}
        </Button>
      </header>

      <div className="config">
      <nav className="config-secciones" aria-label="Secciones de la configuración">
        {config.map((item, indice) => (
          <Button
            key={item.categoria}
            type="text"
            className={indice === pestana ? 'activa' : ''}
            onClick={() => setPestana(indice)}
          >
            {item.categoria}
          </Button>
        ))}
      </nav>

      <section className="panel">
        <h3>{grupo.categoria}</h3>
        <div className={grupo.categoria === 'Textos legales' ? 'campos campos-anchos' : 'campos'}>
          {grupo.ajustes.filter(seMuestra).map((ajuste) => (
            ajuste.clave === 'IMAGEN_FONDO_INGRESO' ? (
              <label key={ajuste.clave} className="campo-ancho">
                {ajuste.etiqueta}
                <FondoIngreso actual={valores[ajuste.clave]} alCambiar={(nombre) => editar(ajuste.clave, nombre)} />
              </label>
            ) : (
            <label key={ajuste.clave}>
              {ajuste.etiqueta}
              {entrada(ajuste)}
              {ajuste.ayuda && <span className="nota">{ajuste.ayuda}</span>}
            </label>
            )
          ))}
        </div>

        {grupo.categoria === 'Correo' && (
          <section className="prueba-envio">
            <h3>Probar el envío</h3>
            <p className="nota">Se manda un correo real, para comprobar que la cuenta quedó bien configurada.</p>
            <div className="fila-formulario">
              <label>Mandar un correo de prueba a
                <Input type="email" value={destinoCorreo} onChange={(e) => setDestinoCorreo(e.target.value)} placeholder="correo@ejemplo.com" />
              </label>
              <Button disabled={enviando === 'probar-correo' || !destinoCorreo} onClick={() => probar('probar-correo', destinoCorreo)}>
                {enviando === 'probar-correo' ? 'Enviando…' : 'Enviar prueba'}
              </Button>
            </div>
          </section>
        )}

        {grupo.categoria === 'SMS' && (
          <section className="prueba-envio">
            <h3>Probar el envío</h3>
            <p className="nota">Con una cuenta gratuita de Twilio solo llegan mensajes a números verificados en su panel.</p>
            <div className="fila-formulario">
              <label>Mandar un SMS de prueba a
                <Input value={destinoSms} onChange={(e) => setDestinoSms(e.target.value)} placeholder="+595981123456" />
              </label>
              <Button disabled={enviando === 'probar-sms' || !destinoSms} onClick={() => probar('probar-sms', destinoSms)}>
                {enviando === 'probar-sms' ? 'Enviando…' : 'Enviar prueba'}
              </Button>
            </div>
          </section>
        )}
      </section>
      </div>
    </>
  );
}
