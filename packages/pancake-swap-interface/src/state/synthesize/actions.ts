import { createAction } from '@reduxjs/toolkit'

export const typeInput = createAction<{ value: string }>('synthesize/typeInput')
export const resetState = createAction<void>('synthesize/resetState')
