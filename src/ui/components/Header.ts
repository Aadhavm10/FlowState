export class Header {
  private element: HTMLElement;

  constructor(private onOpenVisualizer: () => void) {
    this.element = document.createElement('header');
    this.element.className = 'landing-header';
  }

  render(): HTMLElement {
    this.element.innerHTML = `
      <h1>3D Audio Visualizer</h1>
      <button class="open-visualizer-btn btn-primary">Open Visualizer</button>
    `;

    const btn = this.element.querySelector('.open-visualizer-btn') as HTMLButtonElement;
    btn.addEventListener('click', () => {
      this.onOpenVisualizer();
    });

    return this.element;
  }
}
