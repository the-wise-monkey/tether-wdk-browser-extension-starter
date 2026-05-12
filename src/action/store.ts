import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { WalletStateSnapshot } from '../shared/types'

interface UiState {
  snapshot?: WalletStateSnapshot
  busy: boolean
  error?: string
}

const initialState: UiState = {
  busy: false
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setBusy(state, action: PayloadAction<boolean>) {
      state.busy = action.payload
    },
    setSnapshot(state, action: PayloadAction<WalletStateSnapshot>) {
      state.snapshot = action.payload
      state.error = undefined
    },
    setError(state, action: PayloadAction<string | undefined>) {
      state.error = action.payload
    }
  }
})

export const { setBusy, setSnapshot, setError } = uiSlice.actions

export const store = configureStore({
  reducer: {
    ui: uiSlice.reducer
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
