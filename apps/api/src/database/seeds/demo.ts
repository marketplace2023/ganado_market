/**
 * Datos de demostración (sólo desarrollo): un ganadero con dos fincas, anuncios publicados,
 * un remate en vivo, un comprador y algunos servicios del ecosistema.
 *   npm run db:seed:demo -w api   (requiere haber corrido db:seed antes)
 */
import { db, pool } from "#database/connection.ts"
import {
  anuncioMediaTable,
  anunciosTable,
  consultasTable,
  especiesTable,
  fincasTable,
  pujasTable,
  razasTable,
  rolesTable,
  serviciosTable,
  subastaLotesTable,
  subastasTable,
  usersTable,
  usersToRolesTable,
} from "#database/schemas/index.ts"
import { hashPassword, uniqueSlug } from "#modules/shared/lib/utils.ts"
import type { AnuncioDto, RoleName } from "@workspace/shared"
import { and, asc, eq, inArray, isNull } from "drizzle-orm"

const PASSWORD = "Demo1234!"

const demoPhotos = new Map([
  ["Lote de 40 mautes Brahman comerciales", "mautes-brahman"],
  ["Toro padrote Brahman registrado", "toro-brahman"],
  ["30 novillas mestizas para vientre", "novillas-mestizas"],
  ["Novillos Nelore para ceba", "novillos-nelore"],
  ["Lote QA de 15 novillos Simbrah", "novillos-simbrah"],
  ["Vacas Carora paridas con becerra", "vacas-carora"],
  ["Novillas Girolando preñadas", "novillas-girolando"],
  ["Búfalas Murrah en producción", "bufalas-murrah"],
  ["Caballo criollo de soga, manso", "caballo-criollo"],
  ["Chivos Nubian reproductores", "chivos-nubian"],
  ["Becerros Brahman rojo destetados", "becerros-brahman-rojo"],
])

const demoCovers = [
  ["Hato Los Samanes", "hato-los-samanes"],
  ["Finca El Porvenir", "finca-el-porvenir"],
]

const demoImageUrl = (name: string) => `/api/demo-images/${name}.webp`

async function addMissingDemoImages(ownerId: number) {
  return db.transaction(async (tx) => {
    // El editor también bloquea el anuncio antes de reemplazar su galería.
    const anuncios = await tx
      .select({ id: anunciosTable.id, title: anunciosTable.title })
      .from(anunciosTable)
      .where(and(eq(anunciosTable.ownerId, ownerId), inArray(anunciosTable.title, [...demoPhotos.keys()])))
      .orderBy(asc(anunciosTable.id))
      .for("update")

    const photos = await tx
      .select({ anuncioId: anuncioMediaTable.anuncioId })
      .from(anuncioMediaTable)
      .where(inArray(anuncioMediaTable.anuncioId, anuncios.map(({ id }) => id)))
    const conFoto = new Set(photos.map(({ anuncioId }) => anuncioId))
    const faltantes = anuncios.flatMap(({ id, title }) => {
      const asset = demoPhotos.get(title)
      return asset && !conFoto.has(id) ? [{ anuncioId: id, url: demoImageUrl(asset), sortOrder: 0 }] : []
    })
    if (faltantes.length) await tx.insert(anuncioMediaTable).values(faltantes)

    let portadas = 0
    for (const [name, asset] of demoCovers) {
      const updated = await tx
        .update(fincasTable)
        .set({ coverUrl: demoImageUrl(asset) })
        .where(and(eq(fincasTable.ownerId, ownerId), eq(fincasTable.name, name), isNull(fincasTable.coverUrl)))
        .returning({ id: fincasTable.id })
      portadas += updated.length
    }
    return { fotos: faltantes.length, portadas }
  })
}

async function createUser(
  name: string,
  email: string,
  phone: string,
  documentNumber: string,
  roles: RoleName[]
) {
  const [user] = await db
    .insert(usersTable)
    .values({
      name,
      email,
      phone,
      documentType: "cedula",
      documentNumber,
      password: await hashPassword(PASSWORD),
    })
    .returning({ id: usersTable.id })
  const roleRows = await db.select().from(rolesTable).where(inArray(rolesTable.name, roles))
  await db.insert(usersToRolesTable).values(roleRows.map((r) => ({ userId: user.id, roleId: r.id })))
  return user.id
}

async function main() {
  const [exists] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, "ganadero@demo.ve"))
  if (exists) {
    const { fotos, portadas } = await addMissingDemoImages(exists.id)
    console.log(`Datos demo existentes: ${fotos} fotos y ${portadas} portadas añadidas.`)
    return
  }

  const especies = await db.select().from(especiesTable)
  const razas = await db.select().from(razasTable)
  if (!especies.length) throw new Error("Corre primero `npm run db:seed`")
  const esp = (slug: string) => especies.find((e) => e.slug === slug)!.id
  const raza = (slug: string) => razas.find((r) => r.slug === slug)!.id

  const ganaderoId = await createUser("José Rafael Pérez", "ganadero@demo.ve", "584141234567", "V-12345678", ["ganadero", "comprador"])
  const compradorId = await createUser("María Fernanda Rojas", "comprador@demo.ve", "584241112233", "V-20111222", ["comprador"])

  const [hato, finca] = await db
    .insert(fincasTable)
    .values([
      {
        ownerId: ganaderoId,
        name: "Hato Los Samanes",
        slug: uniqueSlug("Hato Los Samanes"),
        estado: "apure",
        municipio: "San Fernando",
        hectareas: 1800,
        descripcion: "Hato de cría y levante en sabana apureña. Ganado Brahman comercial y registrado, manejo sanitario al día.",
        whatsapp: "584141234567",
        hierro: "LS-114",
        verificacion: "verificada",
        verificadaAt: new Date(),
      },
      {
        ownerId: ganaderoId,
        name: "Finca El Porvenir",
        slug: uniqueSlug("Finca El Porvenir"),
        estado: "zulia",
        municipio: "Machiques de Perijá",
        hectareas: 320,
        descripcion: "Finca de doble propósito en el sur del lago. Ordeño mecánico y genética Carora / Gyr.",
        whatsapp: "584141234567",
      },
    ])
    .returning({ id: fincasTable.id })

  type Seed = Omit<AnuncioDto, "media" | "negociable" | "description"> & { description: string; featured?: boolean }
  const base = { vacunaAftosa: true, vacunaBrucelosis: true, guiaMovilizacion: true, desparasitado: true, registroGenealogico: false }
  const anuncios: Seed[] = [
    { ...base, fincaId: hato.id, especieId: esp("bovino"), razaId: raza("brahman"), title: "Lote de 40 mautes Brahman comerciales", description: "Mautes de 12 a 14 meses, destetados y desparasitados. Listos para levante.", tipo: "lote", categoriaAnimal: "maute", sexo: "macho", cantidad: 40, edadMeses: 13, pesoPromedioKg: 230, precioUsd: 1.85, modalidadPrecio: "por_kg", estado: "apure", municipio: "San Fernando", featured: true },
    { ...base, fincaId: hato.id, especieId: esp("bovino"), razaId: raza("brahman"), title: "Toro padrote Brahman registrado", description: "Padrote de 4 años con registro genealógico, probado en monta. Excelente conformación.", tipo: "ejemplar", categoriaAnimal: "padrote", sexo: "macho", cantidad: 1, edadMeses: 48, pesoPromedioKg: 780, precioUsd: 4500, modalidadPrecio: "por_cabeza", estado: "apure", municipio: "San Fernando", registroGenealogico: true, featured: true },
    { ...base, fincaId: hato.id, especieId: esp("bovino"), razaId: raza("mestizo-carne"), title: "30 novillas mestizas para vientre", description: "Novillas cebú mestizo de 18 a 20 meses, aptas para servicio.", tipo: "lote", categoriaAnimal: "novilla", sexo: "hembra", cantidad: 30, edadMeses: 19, pesoPromedioKg: 310, precioUsd: 620, modalidadPrecio: "por_cabeza", estado: "apure", municipio: "Biruaca" },
    { ...base, fincaId: hato.id, especieId: esp("bovino"), razaId: raza("nelore"), title: "Novillos Nelore para ceba", description: "Lote parejo, buen frame. Pesados en romana de la finca.", tipo: "lote", categoriaAnimal: "novillo", sexo: "macho", cantidad: 25, edadMeses: 24, pesoPromedioKg: 410, precioUsd: 1.7, modalidadPrecio: "por_kg", estado: "apure", municipio: "San Fernando" },
    { ...base, fincaId: finca.id, especieId: esp("bovino"), razaId: raza("carora"), title: "Vacas Carora paridas con becerra", description: "Vacas de segundo y tercer parto, producción promedio 12 L/día.", tipo: "lote", categoriaAnimal: "vaca_parida", sexo: "hembra", cantidad: 8, edadMeses: 60, pesoPromedioKg: 480, precioUsd: 1100, modalidadPrecio: "por_cabeza", estado: "zulia", municipio: "Machiques de Perijá", featured: true },
    { ...base, fincaId: finca.id, especieId: esp("bovino"), razaId: raza("girolando"), title: "Novillas Girolando preñadas", description: "Preñez confirmada por palpación, 5 a 6 meses.", tipo: "lote", categoriaAnimal: "vaca_prenada", sexo: "hembra", cantidad: 12, edadMeses: 30, pesoPromedioKg: 420, precioUsd: 950, modalidadPrecio: "por_cabeza", estado: "zulia", municipio: "Machiques de Perijá" },
    { ...base, fincaId: finca.id, especieId: esp("bufalino"), razaId: raza("murrah"), title: "Búfalas Murrah en producción", description: "Búfalas lecheras, ideales para queso de búfala.", tipo: "lote", categoriaAnimal: "vaca", sexo: "hembra", cantidad: 6, edadMeses: 54, pesoPromedioKg: 520, precioUsd: 1300, modalidadPrecio: "por_cabeza", estado: "zulia", municipio: "Machiques de Perijá" },
    { ...base, fincaId: hato.id, especieId: esp("equino"), razaId: raza("criollo-venezolano"), title: "Caballo criollo de soga, manso", description: "Caballo de trabajo llanero, 7 años, manso y bien arreglado para el ganado.", tipo: "ejemplar", categoriaAnimal: "otro", sexo: "macho", cantidad: 1, edadMeses: 84, pesoPromedioKg: null, precioUsd: 900, modalidadPrecio: "por_cabeza", estado: "apure", municipio: "Achaguas" },
    { ...base, fincaId: finca.id, especieId: esp("caprino"), razaId: raza("nubian"), title: "Chivos Nubian reproductores", description: "Machos Anglo Nubian para mejorar rebaño lechero.", tipo: "lote", categoriaAnimal: "otro", sexo: "macho", cantidad: 5, edadMeses: 14, pesoPromedioKg: 55, precioUsd: 180, modalidadPrecio: "por_cabeza", estado: "zulia", municipio: "Machiques de Perijá", guiaMovilizacion: false },
    { ...base, fincaId: hato.id, especieId: esp("bovino"), razaId: raza("brahman-rojo"), title: "Becerros Brahman rojo destetados", description: "Becerros de 8 meses, destete reciente.", tipo: "lote", categoriaAnimal: "becerro", sexo: "macho", cantidad: 50, edadMeses: 8, pesoPromedioKg: 180, precioUsd: 2.1, modalidadPrecio: "por_kg", estado: "apure", municipio: "San Fernando" },
  ]

  const inserted = await db
    .insert(anunciosTable)
    .values(
      anuncios.map(({ featured, ...a }, i) => ({
        ...a,
        ownerId: ganaderoId,
        slug: uniqueSlug(a.title),
        negociable: true,
        status: "publicado" as const,
        isFeatured: Boolean(featured),
        viewCount: 20 + i * 7,
        publishedAt: new Date(Date.now() - i * 36e5 * 5),
      }))
    )
    .returning({ id: anunciosTable.id, title: anunciosTable.title, precioUsd: anunciosTable.precioUsd })

  await addMissingDemoImages(ganaderoId)

  await db.insert(consultasTable).values([
    { anuncioId: inserted[0].id, userId: compradorId, name: "María Fernanda Rojas", phone: "584241112233", message: "Buenas, ¿los mautes tienen guía de movilización vigente? Soy de Barinas." },
    { anuncioId: inserted[4].id, name: "Carlos Urdaneta", phone: "584261239876", message: "Me interesan las vacas Carora, ¿aceptan visita el sábado?" },
  ])

  // Remate en vivo: empezó hace 1 hora y cierra en 2 días.
  const [subasta] = await db
    .insert(subastasTable)
    .values({
      ownerId: ganaderoId,
      fincaId: hato.id,
      title: "Remate virtual Hato Los Samanes — Cría y levante",
      slug: uniqueSlug("Remate virtual Hato Los Samanes"),
      description: "Remate de animales de cría y levante. Pesaje en finca, entrega con guía de movilización.",
      startsAt: new Date(Date.now() - 36e5),
      endsAt: new Date(Date.now() + 2 * 24 * 36e5),
      status: "programada",
    })
    .returning({ id: subastasTable.id })

  const lotes = await db
    .insert(subastaLotesTable)
    .values([
      { subastaId: subasta.id, anuncioId: inserted[2].id, orden: 1, precioBaseUsd: 15000, incrementoUsd: 250 },
      { subastaId: subasta.id, anuncioId: inserted[1].id, orden: 2, precioBaseUsd: 3500, incrementoUsd: 100 },
      { subastaId: subasta.id, anuncioId: inserted[9].id, orden: 3, precioBaseUsd: 14000, incrementoUsd: 250 },
    ])
    .returning({ id: subastaLotesTable.id })
  await db.insert(pujasTable).values({ loteId: lotes[0].id, userId: compradorId, montoUsd: 15250 })

  await db.insert(serviciosTable).values([
    { tipo: "transporte", name: "Transporte Ganadero Los Llanos", description: "Jaulas ganaderas de 30 y 60 cabezas. Rutas llano–centro–occidente.", whatsapp: "584145550101", estados: ["apure", "barinas", "guarico", "cojedes", "portuguesa"], verified: true },
    { tipo: "veterinario", name: "MV. Andreína Villalobos", description: "Palpación, diagnóstico de preñez, plan sanitario y certificados.", whatsapp: "584245550202", estados: ["zulia", "falcon"], verified: true },
    { tipo: "inseminacion", name: "GenTrópico IA", description: "Inseminación artificial a tiempo fijo, semen Brahman, Gyr y Carora.", whatsapp: "584125550303", estados: ["zulia", "tachira", "merida", "barinas"], verified: false },
  ])

  console.log("✓ Datos demo creados")
  console.log(`  Ganadero:  ganadero@demo.ve / ${PASSWORD}`)
  console.log(`  Comprador: comprador@demo.ve / ${PASSWORD}`)
}

main()
  .catch((err) => {
    console.error("Seed demo falló:", err)
    process.exitCode = 1
  })
  .finally(() => pool.end())
