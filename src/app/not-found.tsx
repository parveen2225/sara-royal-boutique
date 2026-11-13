import Link from "next/link";
import { Container } from "react-bootstrap";
export default function NotFound() {
  return (
    <>
      <Container>
        <div className="notFound">
          <h1>404 - Page Not Found</h1>
          <p>Sorry, we couldn’t find that page.</p>
          <nav aria-label="Helpful pages">
            <ul className="d-flex flex-wrap gap-3 mt-4">
              <li><Link href="/">Home</Link></li>
              <li><Link href="/services">Services</Link></li>
              <li><Link href="/gallery">Gallery</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </nav>
        </div>
      </Container>
    </>
  );
}
