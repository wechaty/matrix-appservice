export class Registration {

  // 字段
  senderLocalpart: string;

  // 构造函数
  constructor( senderLocalpart: string ) {
    this.senderLocalpart = senderLocalpart
  }

  // 方法
  getSenderLocalpart( ): string {
    return this.senderLocalpart
  }

}
