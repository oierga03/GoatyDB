// Recuerda, SOLO en este navegador, los anuncios que ha publicado quien lo usa.
//
// No es identidad ni sesión: es una comodidad. Sirve para que, al volver al
// tablón, veas tus propios anuncios marcados y puedas gestionarlos sin haber
// guardado el enlace secreto. La credencial de verdad sigue siendo el
// `manageToken`; esto solo lo tiene a mano por ti. Si cambias de dispositivo,
// usas el enlace que te dimos al publicar.

const KEY = "goaty:my-free-agents";

export type MyAd = { id: string; token: string; nick: string };

function read(): MyAd[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list: MyAd[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* Sin localStorage (modo privado, etc.): el enlace de gestión sigue valiendo. */
  }
}

export function getMyAds(): MyAd[] {
  return read();
}

export function addMyAd(ad: MyAd) {
  const list = read().filter((a) => a.id !== ad.id);
  list.push(ad);
  write(list);
}

export function removeMyAdByToken(token: string) {
  write(read().filter((a) => a.token !== token));
}
