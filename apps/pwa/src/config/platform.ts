// Única fuente de la plataforma online y sus secciones. Las páginas puente derivan sus enlaces
// de aquí en vez de re-escribir https://ayuda.sismo-ve.xyz/<sección> en cada archivo, de modo
// que la identidad de las secciones y la URL base no puedan divergir entre páginas.
export const AYUDA_BASE_URL = 'https://ayuda.sismo-ve.xyz';

export type AyudaSection =
  | 'aliados'
  | 'colaborar'
  | 'links-utiles'
  | 'centros'
  | 'hospitales'
  | 'correcciones'
  | 'pacientes'
  | 'sismos';

export function ayudaUrl(section?: AyudaSection): string {
  return section ? `${AYUDA_BASE_URL}/${section}` : AYUDA_BASE_URL;
}
