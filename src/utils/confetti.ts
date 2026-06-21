/**
 * Sayfada konfeti patlama efekti oluşturan hafif ve bağımsız vanilla JS modülü.
 */
export function launchConfetti() {
  // Zaten aktif bir konfeti canvas'ı varsa yenisini ekleme
  if (document.getElementById('confetti-canvas')) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  // Resize dinleyicisi
  const handleResize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', handleResize);

  const colors = [
    '#f43f5e', '#ec4899', '#d946ef', '#a855f7', 
    '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', 
    '#10b981', '#84cc16', '#eab308', '#f97316'
  ];

  interface Particle {
    x: number;
    y: number;
    size: number;
    color: string;
    angle: number;
    speed: number;
    rotation: number;
    rotationSpeed: number;
    opacity: number;
    gravity: number;
    friction: number;
  }

  const particles: Particle[] = [];
  const particleCount = 120;

  // Parçacıkları oluştur (Ekranın altından yukarı doğru patlama veya üstten dökülme)
  // Çocuk etkinliklerinde ortadan patlama efekti çok eğlencelidir!
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: width / 2,
      y: height * 0.6, // Ekranın ortasından biraz aşağıda patlasın
      size: Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      angle: Math.random() * Math.PI * 2,
      speed: Math.random() * 12 + 8,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 10 - 5,
      opacity: 1,
      gravity: 0.25,
      friction: 0.96
    });
  }

  let animationFrameId: number;

  function updateAndDraw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    let activeParticles = 0;

    for (let p of particles) {
      if (p.opacity <= 0) continue;

      activeParticles++;

      // Fizik Güncellemesi
      p.x += Math.cos(p.angle) * p.speed;
      p.y += Math.sin(p.angle) * p.speed + p.gravity;
      p.speed *= p.friction;
      p.rotation += p.rotationSpeed;
      
      // Belirli bir süre sonra yavaşça şeffaflaşmaya başla
      if (p.speed < 1.5) {
        p.opacity -= 0.015;
      }

      // Parçacığı Çiz
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      
      // Dikdörtgen konfeti çizimi
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 1.5);
      ctx.restore();
    }

    // Parçacıklar bitmediyse devam et
    if (activeParticles > 0) {
      animationFrameId = requestAnimationFrame(updateAndDraw);
    } else {
      cleanup();
    }
  }

  function cleanup() {
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener('resize', handleResize);
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  }

  // Animasyonu Başlat
  updateAndDraw();

  // Güvenlik önlemi: 6 saniye sonra otomatik temizle
  setTimeout(cleanup, 6000);
}
