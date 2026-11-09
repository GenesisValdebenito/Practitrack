
import { supabase } from './supabase'

export type TaskStatus = 'todo' | 'doing' | 'done'

export type TaskRecord = {
    id: string
    title: string
    status: TaskStatus
    activity_id?: string | null
    practice_id?: string | null
    deleted_at?: string | null
    purge_at?: string | null
}

export type OperationResult = {
    success: boolean
    message: string
}

async function getUserId(): Promise<string> {
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
        throw new Error(
            'Tu sesión no está disponible. Inicia sesión nuevamente.'
        )
    }

    return data.user.id
}

function failure(error: unknown, fallback: string): OperationResult {
    return {
        success: false,
        message: error instanceof Error ? error.message : fallback,
    }
}

export async function changeTaskStatus(
    taskId: string,
    status: TaskStatus
): Promise<OperationResult> {
    try {
        const userId = await getUserId()

        const { data, error } = await supabase
            .from('tasks')
            .update({ status })
            .eq('id', taskId)
            .eq('user_id', userId)
            .is('deleted_at', null)
            .select('id')
            .maybeSingle()

        if (error) throw error
        if (!data) throw new Error('No se encontró la tarea activa.')

        return {
            success: true,
            message: 'Estado actualizado correctamente.',
        }
    } catch (error) {
        return failure(error, 'No se pudo actualizar la tarea.')
    }
}

export async function trashTask(
    task: Pick<TaskRecord, 'id' | 'title'>,
    confirmationTitle: string
): Promise<OperationResult> {
    if (confirmationTitle !== task.title) {
        return {
            success: false,
            message: 'Debes escribir exactamente el nombre de la tarea.',
        }
    }

    try {
        const userId = await getUserId()

        const { data: existing, error: lookupError } = await supabase
            .from('tasks')
            .select('id, title')
            .eq('id', task.id)
            .eq('user_id', userId)
            .is('deleted_at', null)
            .maybeSingle()

        if (lookupError) throw lookupError

        if (!existing || existing.title !== confirmationTitle) {
            throw new Error(
                'La tarea cambió o ya no está disponible.'
            )
        }

        const { error } = await supabase.rpc(
            'move_task_to_trash',
            { p_task_id: task.id }
        )

        if (error) throw error

        return {
            success: true,
            message: 'Tarea enviada a la papelera durante 60 días.',
        }
    } catch (error) {
        return failure(error, 'No se pudo enviar la tarea a la papelera.')
    }
}

export async function restoreTask(
    taskId: string
): Promise<OperationResult> {
    try {
        await getUserId()

        const { error } = await supabase.rpc(
            'restore_task_from_trash',
            { p_task_id: taskId }
        )

        if (error) throw error

        return {
            success: true,
            message: 'Solicitud de restauración procesada.',
        }
    } catch (error) {
        return failure(error, 'No se pudo restaurar la tarea.')
    }
}

export async function getActiveTasks(practiceId: string) {
    const userId = await getUserId()

    return supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('practice_id', practiceId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
}

export async function getTrashedTasks(practiceId: string) {
    const userId = await getUserId()

    return supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('practice_id', practiceId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
}
