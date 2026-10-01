"use client";
import React from "react";
import Link from "next/link";
export default function LoginPage() {
    const[studentId, setStudentId] = React.useState("");
    const[password, setPassword] = React.useState("");
    const[error, setError] = React.useState("");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center task-black">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
    <h1 className="text-3xl font-bold text-black">智实验</h1>
    <p className="text-zinc-500">大学物理实验智能导师平台</p >
    <input
    className="w-full rounded-lg border border-zinc-300 px-4 py-3"
    placeholder="请输入学号"
    value={studentId}
    onChange={(e) => setStudentId(e.target.value)}
    />
    <input
    className="mt-4 w-full rounded-lg border border-zinc-300 px-4 py-3"
    type="password"
    placeholder="请输入密码"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    />
    {
        error && <p className="text-red-500">{error}</p>
    }
    <button className="mt-6 w-full rounded-lg bg-blue-500 px-4 py-3 text-white"
     onClick={() =>{
        if(studentId === "" || password === ""){
            console.log("学号或密码不能为空");
            setError("学号或密码不能为空");
            return;
        }
        setError("");
        console.log("登录信息:", studentId, password);
       // console.log("当前密码:", password);
     }}
     > 
        登录
    </button>
    </div>
    </main>
  );
}