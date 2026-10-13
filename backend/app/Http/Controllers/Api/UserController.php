<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /**
     * Tambah atau update user (untuk sync dari AdminUsers)
     */
    public function store(Request $request)
    {
        try {
            $existingUser = User::where('username', $request->input('username'))->first();
            $rules = [
                'username' => 'required|string|min:3',
                'name' => 'required|string',
                'role' => 'required|in:admin,petugas',
                'di_id' => 'nullable|integer|exists:daerah_irigasi,id',
                'building_ids' => 'nullable|array',
                'building_ids.*' => 'string',
            ];
            $rules['password'] = $existingUser ? 'nullable|string|min:3' : 'required|string|min:3';

            $validated = $request->validate($rules);

            \Log::info('[UserController] Creating/updating user', ['username' => $validated['username']]);

            $userData = [
                'name' => $validated['name'],
                'role' => $validated['role'],
                'di_id' => $validated['di_id'] ?? null,
                'building_ids' => $validated['building_ids'] ?? null, // ✅ Simpan daftar bangunan
            ];
            if (!empty($validated['password'])) {
                $userData['password'] = Hash::make($validated['password']);
            }

            $user = User::updateOrCreate(
                ['username' => $validated['username']],
                $userData
            );

            \Log::info('[UserController] User saved successfully', ['user_id' => $user->id, 'username' => $user->username]);

            return response()->json([
                'message' => 'User saved successfully',
                'user' => $user,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::warning('[UserController] Validation error', ['errors' => $e->errors()]);
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            \Log::error('[UserController] Error creating user', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json([
                'message' => 'Failed to create user',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DEBUG: List semua users (hapus ini setelah testing)
     */
    public function index()
    {
        $users = User::all(['id', 'username', 'name', 'role', 'di_id', 'building_ids', 'created_at']);
        return response()->json([
            'total' => $users->count(),
            'users' => $users,
        ]);
    }

    public function destroy($id)
    {
        try {
            $user = User::findOrFail($id);
            $user->delete();

            return response()->json([
                'message' => 'User deleted successfully',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'User not found',
            ], 404);
        } catch (\Exception $e) {
            \Log::error('[UserController] Error deleting user', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Failed to delete user',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * TEST: Create user dari endpoint (untuk verify formula bekerja)
     */
    public function testCreate()
    {
        try {
            $user = User::create([
                'username' => 'test_user_' . time(),
                'password' => Hash::make('testpass123'),
                'name' => 'Test User',
                'role' => 'petugas',
            ]);
            
            return response()->json([
                'message' => 'Test user created',
                'user' => $user,
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Test user creation failed:', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Failed to create test user',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
