import { buttonVariants } from "@workspace/ui/components/button"
import { Link } from "react-router"

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="text-6xl font-semibold text-primary">404</p>
      <h1 className="mt-3 text-xl font-semibold">No encontramos esta página</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Puede que el anuncio se haya vendido o retirado.
      </p>
      <Link to="/ganado" className={buttonVariants({ className: "mt-6" })}>
        Ver ganado disponible
      </Link>
    </div>
  )
}
