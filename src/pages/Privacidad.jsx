import { useNavigate } from 'react-router-dom'

const font = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'

export default function Privacidad() {
  const navigate = useNavigate()

  return (
    <div style={{ fontFamily: font, maxWidth: 640, margin: '0 auto', padding: '40px 24px 80px', color: '#111' }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#111', padding: 0, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}
      >
        ← Volver
      </button>

      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, marginBottom: 8 }}>Política de privacidad</h1>
      <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: 32 }}>Última actualización: mayo 2025</p>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>1. Responsable del tratamiento</h2>
        <p style={{ fontSize: 14, color: '#3a3a3c', lineHeight: 1.7 }}>
          El responsable del tratamiento de los datos recogidos a través de esta aplicación es el titular del restaurante que ha generado el código QR de acceso. Los datos facilitados de forma voluntaria (correo electrónico para recibir el ticket de compra) son tratados únicamente con esa finalidad.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>2. Datos que recogemos</h2>
        <ul style={{ fontSize: 14, color: '#3a3a3c', lineHeight: 1.9, paddingLeft: 20 }}>
          <li>Dirección de correo electrónico (opcional, solo si la introduces para recibir el ticket).</li>
          <li>Datos del pedido: artículos, cantidades, importe total y número de mesa.</li>
          <li>Cookies técnicas de sesión necesarias para el funcionamiento del servicio.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>3. Finalidad del tratamiento</h2>
        <p style={{ fontSize: 14, color: '#3a3a3c', lineHeight: 1.7 }}>
          Los datos se tratan exclusivamente para procesar tu pedido, gestionar el pago a través de Stripe y, si lo solicitas, enviarte el ticket de compra por email mediante Resend. No se ceden a terceros salvo los mencionados para la prestación del servicio.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>4. Base jurídica</h2>
        <p style={{ fontSize: 14, color: '#3a3a3c', lineHeight: 1.7 }}>
          El tratamiento se basa en la ejecución del contrato (RGPD art. 6.1.b) para los datos del pedido y en tu consentimiento expreso para el envío del ticket por email.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>5. Conservación de datos</h2>
        <p style={{ fontSize: 14, color: '#3a3a3c', lineHeight: 1.7 }}>
          Los datos de pedido se conservan durante el plazo legalmente exigido para obligaciones contables y fiscales (mínimo 5 años). Los datos de contacto (email) se eliminan una vez enviado el ticket.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>6. Tus derechos</h2>
        <p style={{ fontSize: 14, color: '#3a3a3c', lineHeight: 1.7 }}>
          Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad contactando con el restaurante responsable. También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>7. Cookies</h2>
        <p style={{ fontSize: 14, color: '#3a3a3c', lineHeight: 1.7 }}>
          Esta aplicación utiliza únicamente cookies técnicas estrictamente necesarias para su funcionamiento y para recordar tu preferencia sobre esta política. No se utilizan cookies de publicidad ni de seguimiento de terceros.
        </p>
      </section>
    </div>
  )
}
