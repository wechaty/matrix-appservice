class Registration {
  // 字段
  sender_localpart:string;

  // 构造函数
  constructor(sender_localpart:string) {
    this.sender_localpart = sender_localpart
  }

  // 方法
  getSenderLocalpart():string {
    return this.sender_localpart
  }
}
