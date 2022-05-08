#version 300 es

#define MAX_NUM_LIGHTS 10

precision mediump float;

in vec3 frag_pos;
in vec3 frag_normal;

uniform int num_lights;
uniform vec3 light_ambient;
uniform vec3 light_positions[MAX_NUM_LIGHTS];//[10]
uniform vec3 light_colors[MAX_NUM_LIGHTS];//[10];
uniform vec3 camera_position;
uniform vec3 material_color;      // Ka and Kd
uniform vec3 material_specular;   // Ks
uniform float material_shininess; // n

out vec4 FragColor;

// dot(x, y), but ensures value is positive. If negative, return 0
float dotPositive(vec3 x, vec3 y) {
    return max(dot(x, y), 0.0);
}

void main() {
    vec3 ambient = light_ambient * material_color; // ambient is the same regardless of lights, so it goes outside of loop
    vec3 result;
    
    for (int i = 0; i < num_lights; i++) {
        vec3 N = normalize(frag_normal);                    // normalized surface normal
        vec3 L = normalize(light_positions[i] - frag_pos);  // normalized light direction // i swapped order of subtraction


        vec3 R = normalize(-(reflect(L,N)));                // normalized reflected light direction
        vec3 V = normalize(camera_position - frag_pos);     // normalized view direction // i swapped order of subtraction

        vec3 diffuse = light_colors[i] *  material_color * dotPositive(N, L);
        vec3 specular = light_colors[i] * material_specular * pow(dotPositive(R,V), material_shininess); // light_color -> light_color[i]

        float dist = length(light_positions[i]-frag_pos);
        float att = 1.0 / (1.0 + 0.1 * dist + 0.01 * dist * dist);

        result = result + (ambient + diffuse + specular) * att;
        //vec3 result = result + ambient + diffuse + specular; // probably want to keep adding result, then likely multiply by att
    }

    FragColor = vec4(result, 1.0);
}
