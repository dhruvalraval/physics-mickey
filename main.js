import { PhysicsLoader } from '@enable3d/ammo-physics'
import './index.scss'
import Canvas from './src/Canvas'

window.addEventListener('load', () => {
    PhysicsLoader('/ammo', () => new Canvas())
})
