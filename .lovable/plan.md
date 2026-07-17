## Objetivo
Reemplazar el ícono actual (Activity en cuadrado) del header del sidebar por la imagen `SINCOM.png` subida, con los bordes difuminados hasta fundirse con el fondo teal del sidebar (#3899A8).

## Cambios

### 1. Subir la imagen como asset
- Copiar `user-uploads://SINCOM.png` como asset CDN vía `lovable-assets create` → `src/assets/simcon-logo.png.asset.json`.

### 2. Editar `src/components/layout/AppSidebar.tsx`
- Reemplazar el `<div>` con `<Activity />` por un `<img>` que use el asset SINCOM.
- Aplicar difuminado de bordes hacia el color del sidebar mediante `mask-image` con gradiente radial (fade a transparente en los bordes), de modo que la imagen se funda visualmente con el fondo teal.
- Ajustar tamaño: ~56–64px en modo expandido, ~40px en modo colapsado.
- Mantener el texto "SIMCON / Sistema Monitoreo de Condiciones" al lado en modo expandido (sin cambios).

### Detalle técnico
```tsx
<img
  src={simconLogo.url}
  alt="SIMCON"
  className="h-14 w-14 object-contain shrink-0"
  style={{
    WebkitMaskImage: 'radial-gradient(circle, black 55%, transparent 78%)',
    maskImage: 'radial-gradient(circle, black 55%, transparent 78%)',
  }}
/>
```
El mask radial produce un feather suave: el centro queda opaco y los bordes se desvanecen a transparencia, dejando ver el fondo teal del sidebar (efecto de fusión).

## Fuera de alcance
- No se cambia el header interno de páginas ni el favicon.
- No se altera la tipografía ni el layout del sidebar.
