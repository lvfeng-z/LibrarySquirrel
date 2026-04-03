package main_go

type User struct{ Name string }

func (u *User) FunA() { u.Name = "Modified" }

func main() {
	// 场景 1：普通变量（可寻址）
	var u1 User
	u1.FunA() // ✅ 编译器自动处理为 (&u1).FunA()

	// 场景 2：指针变量
	u2 := &User{}
	u2.FunA() // ✅ 直接调用

	// 场景 3：字面量（不可寻址）
	// User{}.FunA() // ❌ 编译错误：cannot call pointer method on value
}
