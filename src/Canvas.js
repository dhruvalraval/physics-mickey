import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import gsap from 'gsap'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry'
import { AmmoPhysics } from '@enable3d/ammo-physics'

export default class Canvas {
    constructor () {
        this.clock = new THREE.Clock()
        this.mouse = new THREE.Vector2(0, 0)

        this.createRenderer()
        this.createScene()
        this.createCamera()
        this.createLights()
        this.createGeometry()
        this.createText()
        this.eventListeners()
        this.onResize()
        this.update()
    }

    createRenderer () {
        this.width = window.innerWidth
        this.height = window.innerHeight

        this.renderer = new THREE.WebGLRenderer({
            alpha: false,
            antialias: true,
        })

        this.renderer.setSize(this.width, this.height)
        this.renderer.setPixelRatio(window.devicePixelRatio || 1)
        this.renderer.autoClear = false
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping
        this.renderer.toneMappingExposure = 1

        document.body.appendChild(this.renderer.domElement)
    }

    createScene () {
        this.scene = new THREE.Scene()
        this.physics = new AmmoPhysics(this.scene, { softBodies: true, antialias: true, })
        // this.physics.debug.enable(true)
    }

    createCamera () {
        this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 1, 100)
        this.camera.position.z = 22
        this.camera.position.y = 2.5
        this.camera.position.x = 1
    }

    createLights () {
        const ambient = new THREE.AmbientLight(0xffffff, 1)
        this.scene.add(ambient)

        this.textureLoader = new THREE.TextureLoader()
        const textureEquirec = this.textureLoader.load('/bg-grain.jpg')
        textureEquirec.mapping = THREE.EquirectangularReflectionMapping
        textureEquirec.encoding = THREE.sRGBEncoding

        this.scene.environment = textureEquirec
        this.scene.environment.mapping = THREE.EquirectangularReflectionMapping
        this.scene.background = this.textureLoader.load('/bg-grain.jpg')
    }

    createText () {
        this.textGroup = new THREE.Group()
        const fontLoader = new FontLoader()

        const line1 = 'CREATIVE STUDIO'
        const line2 = 'WITH UNIQUE STYLE'

        fontLoader.load('/Syne_Bold.json', (font) => {
            const material = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: 0xffffff,
                emissiveIntensity: 2,
            })

            // LINE1
            const textGeo1 = new TextGeometry(line1, {
                font,
                size: 2.5,
                height: 0.2,
                curveSegments: 8,
                bevelEnabled: false,
                material: 0,
                extrudeMaterial: 0,
            })
            textGeo1.center()
            textGeo1.computeBoundingBox()

            const textMesh1 = new THREE.Mesh(textGeo1, material)
            textMesh1.position.set(0, 4, -10)
            this.textGroup.add(textMesh1)

            // LINE2
            const textGeo2 = new TextGeometry(line2, {
                font,
                size: 2.5,
                height: 0.2,
                curveSegments: 8,
                bevelEnabled: false,
                material: 0,
                extrudeMaterial: 0,
            })
            textGeo2.center()
            textGeo2.computeBoundingBox()

            const textMesh2 = new THREE.Mesh(textGeo2, material)
            textMesh2.position.set(0, 0, -10)
            this.textGroup.add(textMesh2)
        })

        this.scene.add(this.textGroup)
    }

    createGeometry () {
        // HEAD MODEL
        this.loader = new GLTFLoader(this.manager)
        const dracoLoader = new DRACOLoader()
        dracoLoader.setDecoderPath('/draco/')
        this.loader.setDRACOLoader(dracoLoader)
        this.mesh = null
        this.headMesh = null
        this.object = null

        this.loader.load('/head.glb', (gltf) => {
            this.mesh = gltf.scene
            this.mesh.scale.set(4.2, 4.2, 4.2)
            this.mesh.position.set(1, 0.5, 0)

            this.mesh.traverse(child => {
                if (child.isMesh) {
                    if (child.material.name === 'headMat') {
                        child.material.transmission = 1
                        child.material.transparent = true
                        child.material.thickness = 0.5
                        child.material.ior = 1.55
                        child.material.roughness = 0.1
                        child.material.color = new THREE.Color(0xffffff)
                    }
                }
            })
            this.scene.add(gltf.scene)
        })

        // PROXY HEAD
        this.loader.load('/proxy.glb', (gltf) => {
            // PHYSICS FOR HEAD
            const proxy = gltf.scene.children[0]
            proxy.scale.set(8, 8, 8)
            proxy.position.set(-1.2, 2.5, 0)
            this.scene.add(proxy)
            this.object = proxy
            proxy.traverse(child => {
                if (child.isMesh) {
                    child.material.visible = false
                }

                this.physics.add.existing(proxy, {
                    shape: 'concave',
                    mass: 0,
                    collisionFlags: 2,
                    autoCenter: false,
                })
                proxy.body.setAngularFactor(0, 0, 0)
                proxy.body.setLinearFactor(0, 0, 0)
            })
        })

        // CLOTH
        const clothWidth = 1
        const clothHeight = 9
        const clothNumSegmentsZ = clothWidth * 5
        const clothNumSegmentsY = clothHeight * 5
        const clothPos = new THREE.Vector3(12, -6, 0.25)

        const clothGeometry = new THREE.PlaneGeometry(
            clothWidth,
            clothHeight,
            clothNumSegmentsZ,
            clothNumSegmentsY
        )
        clothGeometry.rotateY(Math.PI / 2)
        clothGeometry.translate(clothPos.x, clothPos.y + clothHeight * 0.5, clothPos.z - clothWidth * 0.5)

        const flagTexture = this.textureLoader.load('/flag.png')
        flagTexture.flipY = true
        flagTexture.repeat.set(1, 1)
        flagTexture.wrapS = THREE.RepeatWrapping
        flagTexture.wrapT = THREE.MirroredRepeatWrapping
        flagTexture.rotation = Math.PI / 2

        this.cloth = new THREE.Mesh(clothGeometry, new THREE.MeshPhongMaterial({
            color: 0xf0f0f0,
            map: flagTexture,
            side: THREE.DoubleSide,
        }))
        this.scene.add(this.cloth)

        // CLOTH PHYSICS
        const softBodyHelpers = new Ammo.btSoftBodyHelpers()
        const clothCorner00 = new Ammo.btVector3(clothPos.x, clothPos.y + clothHeight, clothPos.z)
        const clothCorner01 = new Ammo.btVector3(clothPos.x, clothPos.y + clothHeight, clothPos.z - clothWidth)
        const clothCorner10 = new Ammo.btVector3(clothPos.x, clothPos.y, clothPos.z)
        const clothCorner11 = new Ammo.btVector3(clothPos.x, clothPos.y, clothPos.z - clothWidth)

        const clothSoftBody = softBodyHelpers.CreatePatch(
            this.physics.physicsWorld.getWorldInfo(),
            clothCorner00,
            clothCorner01,
            clothCorner10,
            clothCorner11,
            clothNumSegmentsZ + 1,
            clothNumSegmentsY + 1,
            0,
            true
        )

        const sbConfig = clothSoftBody.get_m_cfg()
        sbConfig.set_viterations(50)
        sbConfig.set_piterations(50)

        clothSoftBody.setTotalMass(15, false)

        Ammo.castObject(clothSoftBody, Ammo.btCollisionObject).getCollisionShape().setMargin(0.04)
        this.physics.physicsWorld.addSoftBody(clothSoftBody, 1, -1)
        this.cloth.userData.physicsBody = clothSoftBody

        clothSoftBody.setActivationState(4)

        // EMPTY OBJECT TO APPEND THE PIN CORNERS OF FLAG THAT MOVES WITH MOUSE
        this.box = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({ visible: false, }))
        this.box.position.set(12, 3, 0.25)
        this.scene.add(this.box)
        // this.box.position.y = 9
        this.physics.add.existing(this.box, { collisionFlags: 2, margin: 0.01, })

        // APPEND CLOTH TO BOX
        const influence = 1
        clothSoftBody.appendAnchor(0, this.box.body.ammo, false, influence)
        clothSoftBody.appendAnchor(clothNumSegmentsZ, this.box.body.ammo, false, influence)
    }

    // EVENTS
    eventListeners () {
        window.addEventListener('resize', this.onResize.bind(this))
        // MOUSEMOVE TO MOVE THE BOX ON CURSOR
        window.addEventListener('mousemove', (e) => { this.onMouseMove.bind(this)(e) })
    }

    onMouseMove (e) {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

        const vec = new THREE.Vector3(this.mouse.x, this.mouse.y, 0)
        vec.unproject(this.camera)
        const direction = vec.sub(this.camera.position).normalize()
        const distance = -this.camera.position.z / direction.z
        const pos = this.camera.position.clone().add(direction.multiplyScalar(distance))
        this.box.position.copy(pos)

        gsap.to(this.textGroup.position, {
            x: this.mouse.x * 0.5,
            y: this.mouse.y * 0.5,
            ease: 'Power2.easeOut',
            duration: 1,
        })

        // if (this.object && this.mesh) {
        //     this.object.position.x = this.mouse.x - 1
        //     this.object.position.y = this.mouse.y + 2
        //     this.object.body.needUpdate = true

        //     this.mesh.position.x = this.mouse.x + 1
        //     this.mesh.position.y = this.mouse.y
        // }
    }

    onResize () {
        const reWidth = window.innerWidth
        const reHeight = window.innerHeight

        this.camera.aspect = reWidth / reHeight
        this.camera.updateProjectionMatrix()

        this.renderer.setSize(reWidth, reHeight)
    }

    // LOOP
    updatePhysics () {
        this.box.body.needUpdate = true

        const softBody = this.cloth.userData.physicsBody
        const clothPositions = this.cloth.geometry.attributes.position.array
        const numVerts = clothPositions.length / 3
        const nodes = softBody.get_m_nodes()
        let indexFloat = 0

        for (let i = 0; i < numVerts; i++) {
            const node = nodes.at(i)
            const nodePos = node.get_m_x()
            clothPositions[indexFloat++] = nodePos.x()
            clothPositions[indexFloat++] = nodePos.y()
            clothPositions[indexFloat++] = nodePos.z()
        }

        this.cloth.geometry.computeVertexNormals()
        this.cloth.geometry.attributes.position.needsUpdate = true
        this.cloth.geometry.attributes.normal.needsUpdate = true

        if (this.object) {
            // this.object.rotation.z += 0.001
            // this.object.body.needUpdate = true
            // this.object.geometry.computeVertexNormals()
        }
    }

    update (t) {
        const delta = this.clock.getDelta()
        this.updatePhysics()
        this.physics.update(delta * 1000)

        if (this.headMesh) {
            this.headMesh.material.time = t / 2000
            console.log(this.headMesh.material.time)
        }

        this.renderer.render(this.scene, this.camera)
        requestAnimationFrame(this.update.bind(this))
    }
}
