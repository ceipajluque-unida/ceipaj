import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// aparicion al hacer scroll de la pagina publica. se marca en el html con
// data-revelar (un elemento) o data-revelar-grupo (los hijos, escalonados).
// devuelve la funcion que deshace todo, para el desmontaje de React.
export function animarLanding(contenedor) {
  if (!contenedor) return () => { };

  const todo = '[data-revelar], [data-revelar-grupo] > *, [data-portada] > *';

  let contexto;
  try {
    contexto = gsap.context(() => {
      const medios = gsap.matchMedia();

      // quien pidió menos movimiento ve todo quieto y en su lugar
      medios.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(todo, { opacity: 1, y: 0 });
      });

      medios.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-portada] > *', {
          // corta y sin espera: la portada es lo primero que se ve
          opacity: 0, y: 18, duration: 0.45, ease: 'power2.out', stagger: 0.06,
          clearProps: 'opacity,transform',
        });

        for (const elemento of contenedor.querySelectorAll('[data-revelar]')) {
          gsap.from(elemento, {
            opacity: 0, y: 30, duration: 0.6, ease: 'power2.out', clearProps: 'opacity,transform',
            scrollTrigger: { trigger: elemento, start: 'top 88%', once: true },
          });
        }

        for (const grupo of contenedor.querySelectorAll('[data-revelar-grupo]')) {
          gsap.from(grupo.children, {
            opacity: 0, y: 26, duration: 0.55, ease: 'power2.out', stagger: 0.08, clearProps: 'opacity,transform',
            scrollTrigger: { trigger: grupo, start: 'top 86%', once: true },
          });
        }
      });
    }, contenedor);
  } catch {
    // si algo falla al armar las animaciones, el contenido igual se ve
    gsap.set(todo, { opacity: 1, y: 0 });
  }

  return () => contexto?.revert();
}

// la barra de navegación se vuelve sólida al bajar de la portada
export function fijarBarra(barra, portada) {
  if (!barra || !portada) return () => { };
  const disparador = ScrollTrigger.create({
    trigger: portada,
    start: 'bottom top+=64',
    onEnter: () => barra.classList.add('landing-barra-solida'),
    onLeaveBack: () => barra.classList.remove('landing-barra-solida'),
  });
  return () => disparador.kill();
}
