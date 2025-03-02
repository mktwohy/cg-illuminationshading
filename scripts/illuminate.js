const {mat4, vec2, vec3, vec4} = glMatrix;

class GlApp {
    constructor(canvas_id, width, height, scene) {
        // initialize <canvas> with a WebGL 2 context
        /** @type {HTMLCanvasElement} */
        this.canvas = document.getElementById(canvas_id);
        this.canvas.width = width;
        this.canvas.height = height;

        /** @type {WebGL2RenderingContext} */
        this.gl = this.canvas.getContext('webgl2');
        if (!this.gl) {
            alert('Unable to initialize WebGL 2. Your browser may not support it.');
        }

        // initialize local data members
        this.shader = {                              // Each shader object will contain the GPU program
            gouraud_color: null,                     // (vertex shader + fragment shader) and its
            gouraud_texture: null,                   // corresponding uniform variables
            phong_color: null,
            phong_texture: null
        };

        this.vertex_position_attrib = 0;             // vertex attribute 0: 3D position
        this.vertex_normal_attrib = 1;               // vertex attribute 1: 3D normal vector
        this.vertex_texcoord_attrib = 2;             // vertex attribute 2: 2D texture coordinates

        this.projection_matrix = mat4.create();      // projection matrix (on CPU)
        this.view_matrix = mat4.create();            // view matrix (on CPU)
        this.model_matrix = mat4.create();           // model matrix (on CPU)

        this.vertex_array = {                        // model Vertex Array Objects (contains all attributes
            plane: null,                             // of the model - vertices, normals, faces, ...)
            cube: null,
            sphere: null,
            custom: null
        };

        this.scene = scene;                          // current scene to draw (list of models and lights)
        this.algorithm = 'gouraud';                  // current shading algorithm to use for rendering


        // download and compile shaders into GPU program
        let gouraud_color_vs = this.getFile('shaders/gouraud_color.vert');
        let gouraud_color_fs = this.getFile('shaders/gouraud_color.frag');
        let gouraud_texture_vs = this.getFile('shaders/gouraud_texture.vert');
        let gouraud_texture_fs = this.getFile('shaders/gouraud_texture.frag');
        let phong_color_vs = this.getFile('shaders/phong_color.vert');
        let phong_color_fs = this.getFile('shaders/phong_color.frag');
        let phong_texture_vs = this.getFile('shaders/phong_texture.vert');
        let phong_texture_fs = this.getFile('shaders/phong_texture.frag');
        let emissive_vs = this.getFile('shaders/emissive.vert');
        let emissive_fs = this.getFile('shaders/emissive.frag');

        Promise.all([gouraud_color_vs, gouraud_color_fs, gouraud_texture_vs, gouraud_texture_fs,
                     phong_color_vs, phong_color_fs, phong_texture_vs, phong_texture_fs,
                     emissive_vs, emissive_fs])
        .then((shaders) => this.loadAllShaders(shaders))
        .catch((error) => this.getFileError(error));
    }
    
    loadAllShaders(shaders) {
        this.shader.gouraud_color = this.createShaderProgram(shaders[0], shaders[1]);
        this.shader.gouraud_texture = this.createShaderProgram(shaders[2], shaders[3]);
        this.shader.phong_color = this.createShaderProgram(shaders[4], shaders[5]);
        this.shader.phong_texture = this.createShaderProgram(shaders[6], shaders[7]);
        this.shader.emissive = this.createShaderProgram(shaders[8], shaders[9]);

        this.initializeGlApp();
    }
    
    createShaderProgram(vert_source, frag_source) {
        // Compile shader program
        let program = glslCreateShaderProgram(this.gl, vert_source, frag_source);

        // Bind vertex input data locations
        this.gl.bindAttribLocation(program, this.vertex_position_attrib, 'vertex_position');
        this.gl.bindAttribLocation(program, this.vertex_normal_attrib, 'vertex_normal');
        this.gl.bindAttribLocation(program, this.vertex_texcoord_attrib, 'vertex_texcoord');

        // Link shader program
        glslLinkShaderProgram(this.gl, program);

        // Get list of uniforms available in shaders
        let uniforms = glslGetShaderProgramUniforms(this.gl, program);
        
        return {program: program, uniforms: uniforms};
    }

    initializeGlApp() {
        // set drawing area to be the entire framebuffer
        this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
        // set the background color
        this.gl.clearColor(this.scene.background[0], this.scene.background[1], this.scene.background[2], 1.0);
        // enable z-buffer for visible surface determination
        this.gl.enable(this.gl.DEPTH_TEST);

        // create models - plane, cube, sphere, and custom
        this.vertex_array.plane = createPlaneVertexArray(this.gl, this.vertex_position_attrib, 
                                                                  this.vertex_normal_attrib,
                                                                  this.vertex_texcoord_attrib);
        this.vertex_array.cube = createCubeVertexArray(this.gl, this.vertex_position_attrib, 
                                                                this.vertex_normal_attrib,
                                                                this.vertex_texcoord_attrib);
        this.vertex_array.sphere = createSphereVertexArray(this.gl, this.vertex_position_attrib, 
                                                                    this.vertex_normal_attrib,
                                                                    this.vertex_texcoord_attrib);
        this.vertex_array.custom = createCustomVertexArray(this.gl, this.vertex_position_attrib, 
                                                                    this.vertex_normal_attrib,
                                                                    this.vertex_texcoord_attrib);

        // initialize projection matrix with a 45deg field of view
        let fov = 30.0 * (Math.PI / 180.0);
        let aspect = this.canvas.width / this.canvas.height;
        mat4.perspective(this.projection_matrix, fov, aspect, 0.1, 100.0);
        
        // initialize view matrix based on scene's camera location / direction
        let cam_pos = this.scene.camera.position;
        let cam_target = this.scene.camera.target;
        let cam_up = this.scene.camera.up;
        mat4.lookAt(this.view_matrix, cam_pos, cam_target, cam_up);

        // render scene
        this.render();
    }

    initializeTexture(image_url) {
        // create texture
        let tex_id = this.gl.createTexture();

        // bind TEXTURE_2D to tex_id
        this.gl.bindTexture(this.gl.TEXTURE_2D, tex_id)

        // set TEXTURE_2D parameters
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR_MIPMAP_LINEAR)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT)

        // download the actual image
        let image = new Image();
        image.crossOrigin = 'anonymous';
        image.addEventListener('load', (event) => {
            // once image is downloaded, update the texture image
            this.updateTexture(tex_id, image);
        }, false);
        image.src = image_url;

        return tex_id;
    }

    createDefaultTexture(color) {
        // (from PowerPoint 14 slide 9)
        let tex_id = this.gl.createTexture();

        // TEXTURE_2D = texture
        this.gl.bindTexture(this.gl.TEXTURE_2D, tex_id)

        // TEXTURE_2D.parameter = value
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR) // or gl.NEAREST
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_NEAREST)
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE) // or gl.NEAS
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)

        // TEXTURE_2D.image = 1px RGBA array
        let image = Uint8Array.from(color)
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);

        // generate mipmap
        this.gl.generateMipmap(this.gl.TEXTURE_2D);

        this.gl.bindTexture(this.gl.TEXTURE_2D, null)
        return tex_id
    }

    updateTexture(tex_id, image_element) {
        // bind TEXTURE_2D to tex_id
        this.gl.bindTexture(this.gl.TEXTURE_2D, tex_id)

        // upload image to GPU as a texture
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            image_element
        );

        // generate mipmap
        this.gl.generateMipmap(this.gl.TEXTURE_2D);

        // unbind TEXTURE_2D
        this.gl.bindTexture(this.gl.TEXTURE_2D, null)

        this.render()
    }

    render() {
        // delete previous frame (reset both framebuffer and z-buffer)
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        let color_shader    = this.getSelectedColorShader()
        let texture_shader  = this.getSelectedTextureShader()
        let light_shader    = this.getEmissiveShader()

        for (let model of this.scene.models) {
            this.drawModel(model, color_shader, texture_shader)
        }

        for (let point_light of this.scene.light.point_lights) {
            this.drawPointLight(point_light, light_shader)
        }
    }

// --- DRAW METHODS ---
    drawPointLight(point_light, shader) {
        this.gl.useProgram(shader.program);

        glMatrix.mat4.identity(this.model_matrix);
        glMatrix.mat4.translate(this.model_matrix, this.model_matrix, point_light.position);
        glMatrix.mat4.scale(this.model_matrix, this.model_matrix, glMatrix.vec3.fromValues(0.1, 0.1, 0.1));

        // upload vert uniforms to GPU
        this.uploadMatrixUniforms(shader)

        // upload frag uniforms to GPU
        this.gl.uniform3fv(shader.uniforms.material_color, point_light.color);

        // draw vertices
        this.gl.bindVertexArray(this.vertex_array['sphere']);
        this.gl.drawElements(this.gl.TRIANGLES, this.vertex_array['sphere'].face_index_count, this.gl.UNSIGNED_SHORT, 0);
        this.gl.bindVertexArray(null);
    }

    drawModel(model, color_shader, texture_shader) {
        if (this.vertex_array[model.type] == null) return

        // transform model to proper position, size, and orientation
        glMatrix.mat4.identity(this.model_matrix);
        glMatrix.mat4.translate(this.model_matrix, this.model_matrix, model.center);
        glMatrix.mat4.rotateZ(this.model_matrix, this.model_matrix, model.rotate_z);
        glMatrix.mat4.rotateY(this.model_matrix, this.model_matrix, model.rotate_y);
        glMatrix.mat4.rotateX(this.model_matrix, this.model_matrix, model.rotate_x);
        glMatrix.mat4.scale(this.model_matrix, this.model_matrix, model.size);

        switch (model.shader) {
            case 'color':
                this.drawModelMaterial(model, color_shader)
                break
            case 'texture':
                this.drawModelTexture(model, texture_shader)
                break
            default:
                console.log("invalid texture type")
                break
        }
    }

    drawModelMaterial(model, shader) {
        this.gl.useProgram(shader.program);

        this.uploadLightCameraUniforms(shader)
        this.uploadMaterialUniforms(shader, model)
        this.uploadMatrixUniforms(shader)

        this.drawVertices(model, shader)

        this.gl.useProgram(null)
    }

    drawModelTexture(model, shader) {
        // setup state
        this.gl.useProgram(shader.program)

        // upload uniforms
        this.uploadTextureUniforms(shader, model)
        this.uploadLightCameraUniforms(shader)
        this.uploadMaterialUniforms(shader, model)
        this.uploadMatrixUniforms(shader)

        // draw
        this.drawVertices(model, shader)

        // teardown state
        this.gl.bindTexture(this.gl.TEXTURE_2D, null)
        this.gl.useProgram(null)
    }

// --- HELPER METHODS FOR gl.useProgram() BLOCKS ---
    /** Note - must be called inside a gl.useProgram() block */
    drawVertices(model) {
        this.gl.bindVertexArray(this.vertex_array[model.type]);
        this.gl.drawElements(this.gl.TRIANGLES, this.vertex_array[model.type].face_index_count, this.gl.UNSIGNED_SHORT, 0);
        this.gl.bindVertexArray(null);
    }

    /** Note - must be called inside a gl.useProgram() block */
    uploadTextureUniforms(shader, model) {
        this.gl.activeTexture(this.gl.TEXTURE0)                         // active texture = slot 0
        this.gl.bindTexture(this.gl.TEXTURE_2D, model.texture.id)       // TEXTURE_2D (active texture) = tex_id
        this.gl.uniform1i(shader.uniforms.image, 0)                     // uniform.image = slot 0

        this.gl.uniform2fv(shader.uniforms.texture_scale, model.texture.scale) // todo placeholder
    }

    /** Note - must be called inside a gl.useProgram() block */
    uploadMatrixUniforms(shader) {
        this.gl.uniformMatrix4fv(shader.uniforms.projection_matrix, false, this.projection_matrix);
        this.gl.uniformMatrix4fv(shader.uniforms.view_matrix, false, this.view_matrix);
        this.gl.uniformMatrix4fv(shader.uniforms.model_matrix, false, this.model_matrix);
    }

    /** Note - must be called inside a gl.useProgram() block */
    uploadLightCameraUniforms(shader) {
        let lights = this.scene.light.point_lights

        for (let i = 0; i < lights.length; i++ ) {
            let uniform_position    = this.gl.getUniformLocation(shader.program, "light_positions["+i+"]")
            let uniform_color       = this.gl.getUniformLocation(shader.program, "light_colors["+i+"]")
            this.gl.uniform3fv(uniform_position, lights[i].position);
            this.gl.uniform3fv(uniform_color, lights[i].color);
        }
        this.gl.uniform1i(shader.uniforms.num_lights, this.scene.light.point_lights.length);
        this.gl.uniform3fv(shader.uniforms.light_ambient, this.scene.light.ambient);
        this.gl.uniform3fv(shader.uniforms.camera_position, this.scene.camera.position);
    }

    /** Note - must be called inside a gl.useProgram() block */
    uploadMaterialUniforms(shader, model) {
        this.gl.uniform1f(shader.uniforms.material_shininess, model.material.shininess);
        this.gl.uniform3fv(shader.uniforms.material_color, model.material.color);
        this.gl.uniform3fv(shader.uniforms.material_specular, model.material.specular);
    }

    updateScene(scene) {
        // update scene
        this.scene = scene;
        
        // set the background color
        this.gl.clearColor(this.scene.background[0], this.scene.background[1], this.scene.background[2], 1.0);
        
        // update view matrix based on camera properties
        let cam_pos = this.scene.camera.position;
        let cam_target = this.scene.camera.target;
        let cam_up = this.scene.camera.up;
        glMatrix.mat4.lookAt(this.view_matrix, cam_pos, cam_target, cam_up);

        // render scene
        this.render();
    }

    setShadingAlgorithm(algorithm) {
        // update shading algorithm
        this.algorithm = algorithm;

        // render scene
        this.render();
    }

    getSelectedColorShader() {
        return this.shader[this.algorithm + "_color"]
    }

    getSelectedTextureShader() {
        return this.shader[this.algorithm + "_texture"]
    }

    getEmissiveShader() {
        return this.shader['emissive']
    }

    getFile(url) {
        return new Promise((resolve, reject) => {
            let req = new XMLHttpRequest();
            req.onreadystatechange = function() {
                if (req.readyState === 4 && req.status === 200) {
                    resolve(req.response);
                }
                else if (req.readyState === 4) {
                    reject({url: req.responseURL, status: req.status});
                }
            };
            req.open('GET', url, true);
            req.send();
        });
    }

    getFileError(error) {
        console.log('Error:', error);
    }
}
