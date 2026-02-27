"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "authenticated") {
            router.push("/dashboard");
        } else if (status === "unauthenticated") {
            router.push("/auth/signin");
        }
    }, [status, router]);

    return (
        <div className="page-loader">
            <div className="spinner"></div>
            <span>Loading RagSphere...</span>
        </div>
    );
}
