export class Preview {
  constructor(element, renderer) {
    this.element = element;
    this.renderer = renderer;
  }

  render(doc) {
    this.element.innerHTML = this.renderer.render(doc);
    document.title = doc.title || 'Lore PDF Generator';
  }
}
