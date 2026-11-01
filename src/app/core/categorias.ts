import { CategoriaObjeto } from '../api/model/categoriaObjeto';

/** Nombre legible e ícono (Material Icons) de cada categoría del backend. */
export const CATEGORIAS: Record<CategoriaObjeto, { label: string; icon: string }> = {
  ELECTRONICOS: { label: 'Electrónicos', icon: 'devices' },
  DOCUMENTOS: { label: 'Documentos', icon: 'description' },
  ROPA: { label: 'Ropa', icon: 'checkroom' },
  ACCESORIOS: { label: 'Accesorios', icon: 'watch' },
  BILLETERAS_Y_MONEDEROS: { label: 'Billeteras y monederos', icon: 'account_balance_wallet' },
  BOLSOS_Y_MALETAS: { label: 'Bolsos y maletas', icon: 'backpack' },
  LLAVES: { label: 'Llaves', icon: 'vpn_key' },
  LIBROS_Y_UTILES: { label: 'Libros y útiles', icon: 'menu_book' },
  TERMOS_Y_CONTENEDORES: { label: 'Termos y contenedores', icon: 'local_drink' },
  CASCOS: { label: 'Cascos', icon: 'sports_motorsports' },
  OTROS: { label: 'Otros', icon: 'inventory_2' },
};
