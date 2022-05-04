#version 300 es

precision highp float;

in vec3 vertex_position;
in vec3 vertex_normal;

uniform vec3 light_ambient;     // Ia
uniform vec3 light_position;
uniform vec3 light_color;       // Ip
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
    //vec3 world_vertex_position = mat3(model_matrix) * vertex_position;
    vec4 world_vertex_position_w = model_matrix * vec4(vertex_position, 1.0); // added this line
    vec3 world_vertex_position = world_vertex_position_w.xyz; // added this line

    vec3 N = normalize(world_vertex_normal);                          // normalized surface normal
    vec3 L = normalize(light_position - world_vertex_position);         // normalized light direction // i swapped order of subtraction

    vec3 R = normalize(-(reflect(L,N)));          // normalized reflected light direction
    vec3 V = normalize(camera_position - world_vertex_position);  // normalized view direction // i swapped order of subtraction


    ambient = light_ambient;
    diffuse = light_color * dotPositive(N, L);
    specular = light_color * pow(dotPositive(R,V), material_shininess);

    




}

