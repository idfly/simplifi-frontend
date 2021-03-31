import { createAction } from '@reduxjs/toolkit'

export const typeInput = createAction<{ value: string }>('unsynthesize/typeInput')
export const resetState = createAction<void>('unsynthesize/resetState')
