import { prisma } from '@/database/client';
import { CreateUserInput, UpdateUserInput } from '@/types/user';
import { User, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Servicio para la gestión de usuarios
 * Maneja la lógica de negocio relacionada con usuarios, autenticación y perfiles
 */
export class UserService {
  /**
   * Crea un nuevo usuario en el sistema
   * Hashea el PIN automáticamente antes de guardar
   */
  static async create(data: CreateUserInput): Promise<User> {
    // 1. Hashear el PIN
    const salt = await bcrypt.genSalt(10);
    const pinHash = await bcrypt.hash(data.pin, salt);

    // 2. Crear usuario en BD
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        pinHash: pinHash,
        avatar: data.avatar,
        bio: data.bio,
        birthDate: data.birthDate,
        status: UserStatus.ACTIVE,
      },
    });
  }

  /**
   * Busca un usuario por su ID
   */
  static async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Busca un usuario por su Email
   */
  static async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Actualiza los datos de un usuario
   */
  static async update(id: string, data: UpdateUserInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        ...data,
      },
    });
  }

  /**
   * Valida el PIN de un usuario (Login)
   */
  static async validatePin(userId: string, pin: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) return false;

    // Verificar si el usuario está bloqueado o inactivo
    if (user.status !== UserStatus.ACTIVE) return false;

    // Comparar PIN
    const isValid = await bcrypt.compare(pin, user.pinHash);

    // Registrar intento (opcional: lógica de bloqueo por intentos fallidos)
    if (!isValid) {
      await prisma.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: { increment: 1 } },
      });
    } else {
      // Resetear intentos fallidos si entra correctamente
      if (user.failedLoginAttempts > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: { failedLoginAttempts: 0, lastLoginAt: new Date() },
        });
      } else {
        await prisma.user.update({
          where: { id: userId },
          data: { lastLoginAt: new Date() },
        });
      }
    }

    return isValid;
  }

  /**
   * Lista todos los usuarios activos (para selectores, etc.)
   */
  static async listActiveUsers(): Promise<User[]> {
    return prisma.user.findMany({
      where: { status: UserStatus.ACTIVE },
      orderBy: { name: 'asc' },
    });
  }
}
