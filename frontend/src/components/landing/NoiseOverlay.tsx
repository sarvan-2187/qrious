const noiseDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATC4ysAAAABnRSTlMA//////96eeD+AAAAy0lEQVQ4y2NgIB8wMTKxgAhWEE10dBBJc0MDEDs4MCDCcXYHEWYGEQ4MTEAszsDCAhIO/hFEeA8S9mEAEeYMIjAxcTB/EGFnYARxWBh+IMJ1EIeFkYEBRHwHEQcGcQYR/x+IOP8HEScGEQYGERYGEQYGIHEQRxABHHEGEQYGLBCxHyIch8BBjEGERwA3nEGEhQFEjEEEPgYRhwAhBgH+g4gDgxCDCDODiAODkIEIB4MQhwAhFmAGIxDhwCDEIIIAgxCDOIM4gwjYAAAIyU037sT4QAAAAABJRU5ErkJggg==";

export default function NoiseOverlay() {
  return (
    <div 
      className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-15"
      style={{
        backgroundImage: `url(${noiseDataUrl})`,
        backgroundRepeat: 'repeat',
        backgroundSize: '100px 100px'
      }}
    />
  );
}
