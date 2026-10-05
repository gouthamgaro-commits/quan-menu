/** Seen by tourists (old or mistyped QR code) as well as vendors, so it speaks both. */
export default function NotFound() {
  return (
    <main className="notfound">
      <h1>Không tìm thấy thực đơn · Menu not found</h1>
      <p className="status">Quán này có thể đã tạm ẩn thực đơn, hoặc mã QR được in với địa chỉ cũ.</p>
      <p className="status" lang="en">This stall may have taken its menu offline, or the code was printed with an old address.</p>
      <a className="btn" href="/">Về trang Quán · Go to Quán</a>
    </main>
  );
}
