import { Modal as ModalAntd } from 'antd';

export default function Modal({ abierto, titulo, alCerrar, children, ancho = 460 }) {
  return (
    <ModalAntd
      open={abierto}
      title={titulo}
      onCancel={alCerrar}
      footer={null}
      width={ancho}
      destroyOnHidden
      mask={{ closable: true }}
    >
      {children}
    </ModalAntd>
  );
}
