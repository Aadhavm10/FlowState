export class BackButton {
  private element: HTMLElement;

  constructor(private onBack: () => void) {
    this.element = document.createElement('button');
    this.element.className = 'back-button';
  }

  render(): HTMLElement {
    this.element.textContent = '← Back';

    this.element.addEventListener('click', () => {
      this.onBack();
    });

    return this.element;
  }
}
