#version 300 es

#define MAX_NUM_LIGHTS 10       // arrays need to have constant sizes for indexing

precision highp float;

in vec3 vertex_position;
in vec3 vertex_normal;

// new uniforms
uniform int num_lights;
uniform vec3 light_positions[MAX_NUM_LIGHTS];
uniform vec3 light_colors[MAX_NUM_LIGHTS];
uniform vec3 light_ambient;     // Ia
uniform vec3 camera_position;
uniform float material_shininess; // n
uniform mat4 model_matrix;
uniform mat4 view_matrix;
uniform mat4 projection_matrix;

out vec3 ambient;
out vec3 diffuse;
out vec3 specular;

// dot(x, y), but ensures value is positive. If negative, return 0
float dotPositive(vec3 x, vec3 y) {
    return max(dot(x, y), 0.0);
}

void main() {
    gl_Position = projection_matrix * view_matrix * model_matrix * vec4(vertex_position, 1.0);

    vec3 world_vertex_normal = normalize(mat3(transpose(inverse(model_matrix))) * vertex_normal);
    vec3 world_vertex_position = (model_matrix * vec4(vertex_position, 1.0)).xyz;

    for (int i = 0; i < num_lights; i++) {
        vec3 N = normalize(world_vertex_normal);                        // normalized surface normal
        vec3 L = normalize(light_positions[i] - world_vertex_position); // normalized light direction

        vec3 R = normalize(-(reflect(L,N)));                            // normalized reflected light direction
        vec3 V = normalize(camera_position - world_vertex_position);    // normalized view direction // i swapped order of subtraction

       
        float dist = length(light_positions[i]- world_vertex_position);
        float att = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist);

        diffuse += light_colors[i] * dotPositive(N, L) * att;
        // diffuse = diffuse + light_color[i] * dotPositive(N,L) * att; // i think att goes in here
        specular += light_colors[i] * pow(dotPositive(R,V), material_shininess);
        //specular = light_color[i] * pow(dotPositive(R,V), material_shininess) * att; // i think att goes in here
    }

    ambient = light_ambient;
}

