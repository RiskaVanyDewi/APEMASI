<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        \Log::info('Login attempt', $request->all());
        $request->validate([
            'username' => 'required',
            'password' => 'required',
            'role' => 'required|in:admin,petugas',
            'di_id' => 'required|integer|exists:daerah_irigasi,id',
        ]);

        // Debug: cek apakah user ada di database
        $user = User::where('username', $request->username)->first();
        \Log::info('User lookup', ['username' => $request->username, 'found' => $user ? true : false]);

        if (!Auth::attempt($request->only('username', 'password'))) {
            \Log::warning('Login failed', ['username' => $request->username]);
            return response()->json([
                'message' => 'Invalid credentials',
                'debug' => [
                    'user_exists' => $user ? true : false,
                    'username_checked' => $request->username
                ]
            ], 401);
        }

        $user = Auth::user();
        if ($user->role !== $request->role) {
            return response()->json([
                'message' => 'Role tidak sesuai dengan akun.',
            ], 403);
        }

        if ((int) $user->di_id !== (int) $request->di_id) {
            return response()->json([
                'message' => 'Daerah irigasi tidak sesuai. Akses ditolak.',
            ], 403);
        }
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login success',
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }
}
