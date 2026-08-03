import { useEffect, useState } from 'react';
import { Modal, Skeleton } from 'antd';
import { llamarApi } from '../servicios/api.js';
import { comoHtml } from '../servicios/markdownSimple.jsx';

export default function Legales({ variante = 'pie', texto = 'Ver la política de privacidad' }) {
  const [abierto, setAbierto] = useState(null);
  const [textos, setTextos] = useState(null);

  useEffect(() => {
    if (!abierto || textos) return;
    llamarApi('/api/configuracion/legales').then(setTextos).catch(() => setTextos({}));
  }, [abierto]);

  const titulo = abierto === 'terminos' ? 'Términos y condiciones de uso' : 'Política de privacidad';
  const cuerpo = abierto === 'terminos' ? textos?.terminos : textos?.politica;

  return (
    <>
      {variante === 'pie' ? (
        <footer className="pie-legal">
          <button type="button" onClick={() => setAbierto('politica')}>Política de privacidad</button>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={() => setAbierto('terminos')}>Términos y condiciones</button>
        </footer>
      ) : (
        <button type="button" className="enlace" onClick={() => setAbierto('politica')}>{texto}</button>
      )}

      <Modal
        open={Boolean(abierto)}
        title={titulo}
        onCancel={() => setAbierto(null)}
        footer={null}
        width={860}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <article className="documento-legal">
          {textos ? comoHtml(cuerpo) : <Skeleton active paragraph={{ rows: 8 }} />}
        </article>
      </Modal>
    </>
  );
}
