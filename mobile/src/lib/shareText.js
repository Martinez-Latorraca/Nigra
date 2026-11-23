// Texto que acompaña al link al compartir una ficha (Compartir.dc.html,
// sección 4): sin emojis, con el dato clave y el link al final. La vista
// previa (imagen, título) la arma el servidor a partir del link.
import { translateType } from './translations';

const barrioOf = (address) => (address ? String(address).split(',')[0].trim() : '');

// "hoy", "ayer", "hace 2 días", "hace 3 semanas"…
export function sinceText(iso, now = new Date()) {
  if (!iso) return '';
  const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((start(now) - start(new Date(iso))) / 86400000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 14) return `hace ${days} días`;
  if (days < 60) return `hace ${Math.round(days / 7)} semanas`;
  return `hace ${Math.round(days / 30)} meses`;
}

export function petShareMessage(pet, baseUrl, now = new Date()) {
  const link = `${baseUrl}/pet/${pet.id}`;
  const barrio = barrioOf(pet.address);
  const type = translateType(pet.type) || 'mascota';
  if (pet.status === 'lost') {
    const who = pet.name ? `a ${pet.name}` : `a este ${type}`;
    const where = [barrio ? `en ${barrio}` : null, sinceText(pet.created_at, now)].filter(Boolean).join(' ');
    return `¡Ayudanos a encontrar ${who}! Se perdió${where ? ` ${where}` : ''}. Si la viste, avisá en Mimo: ${link}`;
  }
  return `Encontramos este ${type}${barrio ? ` en ${barrio}` : ''}. ¿Es tuyo o lo conocés? Escribí en Mimo: ${link}`;
}

export function adoptionShareMessage(pet, baseUrl) {
  const link = `${baseUrl}/adoptions/${pet.id}`;
  const name = pet.name || 'Esta mascota';
  if (pet.adopted_at) return `${name} encontró familia gracias a Mimo: ${link}`;
  const verb = pet.sex === 'female' ? 'Conocela' : 'Conocelo';
  return `${name} busca familia. ${verb} y compartí para que encuentre su casa: ${link}`;
}
