# Arena Estelar ⭐

Juego de arena de combate top-down (estilo *brawler*), **100% original**, para jugar en el celular **sin internet**. Hecho para instalarse desde Safari en el iPhone (PWA).

> Inspirado en el género de los *brawlers* de arena, pero con **nombres, personajes, dibujos y títulos propios**. No usa marcas, arte, logos ni sonidos de terceros.

## Cómo instalarlo en el iPhone
1. Abrí el juego en **Safari**.
2. Tocá **Compartir** → **Agregar a pantalla de inicio**.
3. Abrilo una vez con internet desde el ícono; después funciona **offline**.

## Qué tiene
- **10 luchadores** originales, cada uno con arma distinta (escopeta, francotirador, metralleta, lanzabombas, cuchillas, ondas, dobles, pesado) y un **super** único.
- **4 modos**: Atrapagemas (3v3), Revienta Cajas (3v3), Todos contra Todos y Supervivencia por oleadas.
- **Bots con IA** que se mueven, buscan cobertura, apuntan y usan supers.
- **Controles táctiles**: joystick para moverse, joystick para apuntar/disparar, auto-disparo y botón de super.
- **Progresión**: desbloqueá y mejorá luchadores (nivel 1 a 11). Oro y gemas **infinitos** (∞).
- **Cajas** con animación de apertura.
- Guardado en `localStorage`, efectos de sonido con WebAudio (con silenciar), y PWA offline.

## Técnico
- HTML + Canvas 2D + JavaScript puro, sin librerías. `requestAnimationFrame`, partículas limitadas, pensado para correr fluido en gama baja.
- Service worker que cachea todo para uso sin conexión.

Hecho con cariño para Agustín.
