import { useEffect, useState } from 'preact/hooks';

type Platform = 'android' | 'ios';

const steps = {
  android: [
    'Abre esta web en Chrome.',
    'Toca el menú de tres puntos.',
    'Elige Instalar app o Agregar a pantalla principal.',
    'Confirma con Instalar.',
    'Abre Sismo VE desde el icono de tu pantalla.'
  ],
  ios: [
    'Abre esta web en Safari.',
    'Toca el botón Compartir.',
    'Elige Agregar a pantalla de inicio.',
    'Confirma con Agregar.',
    'Abre Sismo VE desde el icono de tu pantalla.'
  ]
};

const installImages: Record<Platform, { src: string; alt: string }> = {
  android: {
    src: '/graphics/install-android.png',
    alt: 'Guía visual para instalar la app desde el menú de Chrome en Android'
  },
  ios: {
    src: '/graphics/install-ios.png',
    alt: 'Guía visual para agregar la app a pantalla de inicio desde Safari en iPhone'
  }
};

export default function InstallGuide() {
  const [platform, setPlatform] = useState<Platform>('android');
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform('ios');
    }
  }, []);

  const activeSteps = steps[platform];
  const activeImage = installImages[platform];
  const isLast = currentStep === activeSteps.length - 1;

  const choosePlatform = (nextPlatform: Platform) => {
    setPlatform(nextPlatform);
    setCurrentStep(0);
  };

  return (
    <section class="install-guide" aria-labelledby="install-guide-title">
      <div class="install-guide__header">
        <p class="eyebrow">ACCESO SIN SEÑAL</p>
        <h2 id="install-guide-title">Instala la app en tu teléfono</h2>
        <p>
          Hazlo cuando tengas conexión. Después de la primera carga, el teléfono conserva los
          protocolos para consultarlos sin internet.
        </p>
      </div>

      <div class="platform-toggle" role="tablist" aria-label="Sistema operativo">
        <button
          class={platform === 'android' ? 'is-active' : ''}
          type="button"
          role="tab"
          aria-selected={platform === 'android'}
          onClick={() => choosePlatform('android')}
        >
          Android
        </button>
        <button
          class={platform === 'ios' ? 'is-active' : ''}
          type="button"
          role="tab"
          aria-selected={platform === 'ios'}
          onClick={() => choosePlatform('ios')}
        >
          iPhone
        </button>
      </div>

      <img class="install-visual" src={activeImage.src} alt={activeImage.alt} />

      <div class="install-step-card">
        <span class="install-step-card__count">
          {currentStep + 1}/{activeSteps.length}
        </span>
        <p>{activeSteps[currentStep]}</p>
      </div>

      <div class="install-progress" aria-hidden="true">
        {activeSteps.map((_, index) => (
          <button
            type="button"
            class={index === currentStep ? 'is-active' : ''}
            onClick={() => setCurrentStep(index)}
            aria-label={`Ver paso ${index + 1}`}
          />
        ))}
      </div>

      <div class="inline-actions">
        <button
          class="button-brutal"
          type="button"
          disabled={currentStep === 0}
          onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
        >
          Anterior
        </button>
        <button
          class="button-brutal"
          type="button"
          onClick={() => setCurrentStep((step) => (isLast ? 0 : step + 1))}
        >
          {isLast ? 'Repetir' : 'Siguiente'}
        </button>
      </div>
    </section>
  );
}
