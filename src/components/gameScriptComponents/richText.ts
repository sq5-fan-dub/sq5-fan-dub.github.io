
export class RichText {
  private segments_: RichTextSegment[];
  constructor(segments: RichTextSegment[]) {
    this.segments_ = segments;
  }
  get segments(): RichTextSegment[] {
    return this.segments_;
  }

  static ofPlainText(text: string): RichText {
    return new RichText([
      RichTextSegment.ofPlainText(text)
    ]);
  }
}

export class RichTextSegment {
  private style_: RichTextStyle;
  private text_: string;
  constructor(style: RichTextStyle, text: string) {
    this.style_ = style;
    this.text_ = text;
  }
  get style(): RichTextStyle {
    return this.style_;
  }
  get text(): string {
    return this.text_;
  }

  static ofPlainText(text: string): RichTextSegment {
    return new RichTextSegment(new RichTextStyle(false, false), text);
  }
}

export class RichTextStyle {
  private bold_: boolean;
  private italic_: boolean;
  constructor(bold: boolean, italic: boolean) {
    this.bold_ = bold;
    this.italic_ = italic;
  }
  get bold(): boolean {
    return this.bold_;
  }
  get italic(): boolean {
    return this.italic_;
  }
}