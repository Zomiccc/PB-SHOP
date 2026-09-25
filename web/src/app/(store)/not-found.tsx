import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-pb grid min-h-[70vh] place-items-center py-20 text-center">
      <div>
        <p className="display text-[8rem] leading-none md:text-[12rem]">
          <span className="text-blue">4</span>
          <span className="text-red">0</span>
          <span className="text-gold">4</span>
        </p>
        <h1 className="display mt-4 text-4xl">This page needs a repair.</h1>
        <p className="mt-3 text-muted">We couldn&apos;t find what you were looking for.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="btn btn-primary">Go home</Link>
          <Link href="/new-phones" className="btn btn-red">Shop phones</Link>
        </div>
      </div>
    </div>
  );
}
