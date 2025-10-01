/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/upload/video-url/route";
exports.ids = ["app/api/upload/video-url/route"];
exports.modules = {

/***/ "(rsc)/./app/api/upload/video-url/route.ts":
/*!*******************************************!*\
  !*** ./app/api/upload/video-url/route.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var googleapis__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! googleapis */ \"(rsc)/./node_modules/googleapis/build/src/index.js\");\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n\n\nasync function POST(req) {\n    try {\n        // Add request body parsing with error handling\n        let body;\n        try {\n            body = await req.json();\n        } catch (parseError) {\n            console.error(\"Failed to parse request body:\", parseError);\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: \"Invalid JSON in request body\"\n            }, {\n                status: 400\n            });\n        }\n        const { filename, mimeType, fileSize } = body;\n        // Validate required fields\n        if (!filename || !mimeType) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: \"Missing required fields: filename and mimeType are required\"\n            }, {\n                status: 400\n            });\n        }\n        // Check environment variables\n        const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\\\n/g, \"\\n\");\n        const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;\n        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;\n        if (!privateKey || !clientEmail || !folderId) {\n            console.error(\"Missing environment variables:\", {\n                hasPrivateKey: !!privateKey,\n                hasClientEmail: !!clientEmail,\n                hasFolderId: !!folderId\n            });\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: \"Missing Google credentials or folder ID\"\n            }, {\n                status: 500\n            });\n        }\n        console.log(`Creating resumable upload for: ${filename} (${fileSize ? (fileSize / 1024 / 1024).toFixed(2) + 'MB' : 'unknown size'})`);\n        const auth = new googleapis__WEBPACK_IMPORTED_MODULE_1__.google.auth.GoogleAuth({\n            credentials: {\n                client_email: clientEmail,\n                private_key: privateKey\n            },\n            scopes: [\n                \"https://www.googleapis.com/auth/drive.file\"\n            ]\n        });\n        // Get the auth client with access token\n        const authClient = await auth.getClient();\n        const accessToken = (await authClient.getAccessToken()).token;\n        if (!accessToken) {\n            console.error(\"Failed to get access token from Google Auth\");\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: \"Failed to get access token\"\n            }, {\n                status: 500\n            });\n        }\n        console.log(\"Successfully got access token, initiating resumable upload...\");\n        // Create headers for resumable upload\n        const headers = {\n            Authorization: `Bearer ${accessToken}`,\n            \"Content-Type\": \"application/json; charset=UTF-8\",\n            \"X-Upload-Content-Type\": mimeType\n        };\n        // Add content length if file size is provided\n        if (fileSize) {\n            headers[\"X-Upload-Content-Length\"] = fileSize.toString();\n        }\n        // Initiate resumable upload session\n        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable`, {\n            method: \"POST\",\n            headers,\n            body: JSON.stringify({\n                name: filename,\n                parents: [\n                    folderId\n                ],\n                mimeType\n            })\n        });\n        console.log(`Resumable upload initiation response: ${response.status} ${response.statusText}`);\n        if (!response.ok) {\n            const errorText = await response.text();\n            console.error(\"Error initiating resumable upload:\", {\n                status: response.status,\n                statusText: response.statusText,\n                errorText,\n                headers: Object.fromEntries(response.headers.entries())\n            });\n            // More specific error messages based on status codes\n            let errorMessage = `Failed to initiate upload: ${response.status} ${response.statusText}`;\n            if (response.status === 401) {\n                errorMessage = \"Authentication failed - check Google credentials\";\n            } else if (response.status === 403) {\n                errorMessage = \"Permission denied - check Google Drive folder permissions\";\n            } else if (response.status === 404) {\n                errorMessage = \"Google Drive folder not found - check folder ID\";\n            }\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: errorMessage\n            }, {\n                status: 500\n            });\n        }\n        const uploadUrl = response.headers.get(\"location\");\n        if (!uploadUrl) {\n            console.error(\"No upload URL returned from Google Drive API\");\n            console.log(\"Response headers:\", Object.fromEntries(response.headers.entries()));\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: \"No upload URL returned from Google Drive\"\n            }, {\n                status: 500\n            });\n        }\n        console.log(\"Successfully created resumable upload URL\");\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            uploadUrl,\n            message: `Resumable upload URL created for ${filename}`\n        });\n    } catch (err) {\n        console.error(\"Unexpected error in video upload route:\", {\n            message: err.message,\n            stack: err.stack,\n            name: err.name\n        });\n        // More specific error handling\n        let errorMessage = \"Unexpected server error\";\n        if (err.code === 'ENOTFOUND') {\n            errorMessage = \"Network error - unable to reach Google Drive API\";\n        } else if (err.message?.includes('timeout')) {\n            errorMessage = \"Request timeout - Google Drive API is slow to respond\";\n        } else if (err.message) {\n            errorMessage = `Server error: ${err.message}`;\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: errorMessage\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUNBRSxTQUFTLENBQUMsaUNBQWlDLEVBQUVoRCxVQUFVO1FBQ3pEO0lBRUYsRUFBRSxPQUFPaUQsS0FBVTtRQUNqQnBELFFBQVFDLEtBQUssQ0FBQywyQ0FBMkM7WUFDdkRrRCxTQUFTQyxJQUFJRCxPQUFPO1lBQ3BCRSxPQUFPRCxJQUFJQyxLQUFLO1lBQ2hCZCxNQUFNYSxJQUFJYixJQUFJO1FBQ2hCO1FBRUEsK0JBQStCO1FBQy9CLElBQUlTLGVBQWU7UUFFbkIsSUFBSUksSUFBSUUsSUFBSSxLQUFLLGFBQWE7WUFDNUJOLGVBQWU7UUFDakIsT0FBTyxJQUFJSSxJQUFJRCxPQUFPLEVBQUVJLFNBQVMsWUFBWTtZQUMzQ1AsZUFBZTtRQUNqQixPQUFPLElBQUlJLElBQUlELE9BQU8sRUFBRTtZQUN0QkgsZUFBZSxDQUFDLGNBQWMsRUFBRUksSUFBSUQsT0FBTyxFQUFFO1FBQy9DO1FBRUEsT0FBT3pELHFEQUFZQSxDQUFDSSxJQUFJLENBQUM7WUFBRUcsT0FBTytDO1FBQWEsR0FBRztZQUFFOUMsUUFBUTtRQUFJO0lBQ2xFO0FBQ0YiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcR2VicnVpa2VyXFxEZXNrdG9wXFxjb2RpbmdcXFdlYnNpdGUgZm9yIFNhdHVyZGF5IDQtMTBcXGFwcFxcYXBpXFx1cGxvYWRcXHZpZGVvLXVybFxccm91dGUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZ29vZ2xlIH0gZnJvbSBcImdvb2dsZWFwaXNcIjtcclxuaW1wb3J0IHsgTmV4dFJlcXVlc3QsIE5leHRSZXNwb25zZSB9IGZyb20gXCJuZXh0L3NlcnZlclwiO1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIFBPU1QocmVxOiBOZXh0UmVxdWVzdCkge1xyXG4gIHRyeSB7XHJcbiAgICAvLyBBZGQgcmVxdWVzdCBib2R5IHBhcnNpbmcgd2l0aCBlcnJvciBoYW5kbGluZ1xyXG4gICAgbGV0IGJvZHk7XHJcbiAgICB0cnkge1xyXG4gICAgICBib2R5ID0gYXdhaXQgcmVxLmpzb24oKTtcclxuICAgIH0gY2F0Y2ggKHBhcnNlRXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBwYXJzZSByZXF1ZXN0IGJvZHk6XCIsIHBhcnNlRXJyb3IpO1xyXG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogXCJJbnZhbGlkIEpTT04gaW4gcmVxdWVzdCBib2R5XCIgfSwgeyBzdGF0dXM6IDQwMCB9KTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB7IGZpbGVuYW1lLCBtaW1lVHlwZSwgZmlsZVNpemUgfSA9IGJvZHk7XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgcmVxdWlyZWQgZmllbGRzXHJcbiAgICBpZiAoIWZpbGVuYW1lIHx8ICFtaW1lVHlwZSkge1xyXG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBcclxuICAgICAgICBlcnJvcjogXCJNaXNzaW5nIHJlcXVpcmVkIGZpZWxkczogZmlsZW5hbWUgYW5kIG1pbWVUeXBlIGFyZSByZXF1aXJlZFwiIFxyXG4gICAgICB9LCB7IHN0YXR1czogNDAwIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGVudmlyb25tZW50IHZhcmlhYmxlc1xyXG4gICAgY29uc3QgcHJpdmF0ZUtleSA9IHByb2Nlc3MuZW52LkdPT0dMRV9QUklWQVRFX0tFWT8ucmVwbGFjZSgvXFxcXG4vZywgXCJcXG5cIik7XHJcbiAgICBjb25zdCBjbGllbnRFbWFpbCA9IHByb2Nlc3MuZW52LkdPT0dMRV9DTElFTlRfRU1BSUw7XHJcbiAgICBjb25zdCBmb2xkZXJJZCA9IHByb2Nlc3MuZW52LkdPT0dMRV9EUklWRV9GT0xERVJfSUQ7XHJcblxyXG4gICAgaWYgKCFwcml2YXRlS2V5IHx8ICFjbGllbnRFbWFpbCB8fCAhZm9sZGVySWQpIHtcclxuICAgICAgY29uc29sZS5lcnJvcihcIk1pc3NpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzOlwiLCB7XHJcbiAgICAgICAgaGFzUHJpdmF0ZUtleTogISFwcml2YXRlS2V5LFxyXG4gICAgICAgIGhhc0NsaWVudEVtYWlsOiAhIWNsaWVudEVtYWlsLFxyXG4gICAgICAgIGhhc0ZvbGRlcklkOiAhIWZvbGRlcklkXHJcbiAgICAgIH0pO1xyXG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBcclxuICAgICAgICBlcnJvcjogXCJNaXNzaW5nIEdvb2dsZSBjcmVkZW50aWFscyBvciBmb2xkZXIgSURcIiBcclxuICAgICAgfSwgeyBzdGF0dXM6IDUwMCB9KTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZyhgQ3JlYXRpbmcgcmVzdW1hYmxlIHVwbG9hZCBmb3I6ICR7ZmlsZW5hbWV9ICgke2ZpbGVTaXplID8gKGZpbGVTaXplIC8gMTAyNCAvIDEwMjQpLnRvRml4ZWQoMikgKyAnTUInIDogJ3Vua25vd24gc2l6ZSd9KWApO1xyXG5cclxuICAgIGNvbnN0IGF1dGggPSBuZXcgZ29vZ2xlLmF1dGguR29vZ2xlQXV0aCh7XHJcbiAgICAgIGNyZWRlbnRpYWxzOiB7XHJcbiAgICAgICAgY2xpZW50X2VtYWlsOiBjbGllbnRFbWFpbCxcclxuICAgICAgICBwcml2YXRlX2tleTogcHJpdmF0ZUtleSxcclxuICAgICAgfSxcclxuICAgICAgc2NvcGVzOiBbXCJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL2RyaXZlLmZpbGVcIl0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHZXQgdGhlIGF1dGggY2xpZW50IHdpdGggYWNjZXNzIHRva2VuXHJcbiAgICBjb25zdCBhdXRoQ2xpZW50ID0gYXdhaXQgYXV0aC5nZXRDbGllbnQoKTtcclxuICAgIGNvbnN0IGFjY2Vzc1Rva2VuID0gKGF3YWl0IGF1dGhDbGllbnQuZ2V0QWNjZXNzVG9rZW4oKSkudG9rZW47XHJcblxyXG4gICAgaWYgKCFhY2Nlc3NUb2tlbikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGdldCBhY2Nlc3MgdG9rZW4gZnJvbSBHb29nbGUgQXV0aFwiKTtcclxuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6IFwiRmFpbGVkIHRvIGdldCBhY2Nlc3MgdG9rZW5cIiB9LCB7IHN0YXR1czogNTAwIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKFwiU3VjY2Vzc2Z1bGx5IGdvdCBhY2Nlc3MgdG9rZW4sIGluaXRpYXRpbmcgcmVzdW1hYmxlIHVwbG9hZC4uLlwiKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgaGVhZGVycyBmb3IgcmVzdW1hYmxlIHVwbG9hZFxyXG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2FjY2Vzc1Rva2VufWAsXHJcbiAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD1VVEYtOFwiLFxyXG4gICAgICBcIlgtVXBsb2FkLUNvbnRlbnQtVHlwZVwiOiBtaW1lVHlwZSxcclxuICAgIH07XHJcblxyXG4gICAgLy8gQWRkIGNvbnRlbnQgbGVuZ3RoIGlmIGZpbGUgc2l6ZSBpcyBwcm92aWRlZFxyXG4gICAgaWYgKGZpbGVTaXplKSB7XHJcbiAgICAgIGhlYWRlcnNbXCJYLVVwbG9hZC1Db250ZW50LUxlbmd0aFwiXSA9IGZpbGVTaXplLnRvU3RyaW5nKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSW5pdGlhdGUgcmVzdW1hYmxlIHVwbG9hZCBzZXNzaW9uXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKFxyXG4gICAgICBgaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vdXBsb2FkL2RyaXZlL3YzL2ZpbGVzP3VwbG9hZFR5cGU9cmVzdW1hYmxlYCxcclxuICAgICAge1xyXG4gICAgICAgIG1ldGhvZDogXCJQT1NUXCIsXHJcbiAgICAgICAgaGVhZGVycyxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBuYW1lOiBmaWxlbmFtZSxcclxuICAgICAgICAgIHBhcmVudHM6IFtmb2xkZXJJZF0sXHJcbiAgICAgICAgICBtaW1lVHlwZSxcclxuICAgICAgICB9KSxcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgUmVzdW1hYmxlIHVwbG9hZCBpbml0aWF0aW9uIHJlc3BvbnNlOiAke3Jlc3BvbnNlLnN0YXR1c30gJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xyXG5cclxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgY29uc3QgZXJyb3JUZXh0ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xyXG4gICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3IgaW5pdGlhdGluZyByZXN1bWFibGUgdXBsb2FkOlwiLCB7XHJcbiAgICAgICAgc3RhdHVzOiByZXNwb25zZS5zdGF0dXMsXHJcbiAgICAgICAgc3RhdHVzVGV4dDogcmVzcG9uc2Uuc3RhdHVzVGV4dCxcclxuICAgICAgICBlcnJvclRleHQsXHJcbiAgICAgICAgaGVhZGVyczogT2JqZWN0LmZyb21FbnRyaWVzKHJlc3BvbnNlLmhlYWRlcnMuZW50cmllcygpKVxyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIC8vIE1vcmUgc3BlY2lmaWMgZXJyb3IgbWVzc2FnZXMgYmFzZWQgb24gc3RhdHVzIGNvZGVzXHJcbiAgICAgIGxldCBlcnJvck1lc3NhZ2UgPSBgRmFpbGVkIHRvIGluaXRpYXRlIHVwbG9hZDogJHtyZXNwb25zZS5zdGF0dXN9ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH1gO1xyXG4gICAgICBcclxuICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxKSB7XHJcbiAgICAgICAgZXJyb3JNZXNzYWdlID0gXCJBdXRoZW50aWNhdGlvbiBmYWlsZWQgLSBjaGVjayBHb29nbGUgY3JlZGVudGlhbHNcIjtcclxuICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMykge1xyXG4gICAgICAgIGVycm9yTWVzc2FnZSA9IFwiUGVybWlzc2lvbiBkZW5pZWQgLSBjaGVjayBHb29nbGUgRHJpdmUgZm9sZGVyIHBlcm1pc3Npb25zXCI7XHJcbiAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDQpIHtcclxuICAgICAgICBlcnJvck1lc3NhZ2UgPSBcIkdvb2dsZSBEcml2ZSBmb2xkZXIgbm90IGZvdW5kIC0gY2hlY2sgZm9sZGVyIElEXCI7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiBlcnJvck1lc3NhZ2UgfSwgeyBzdGF0dXM6IDUwMCB9KTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB1cGxvYWRVcmwgPSByZXNwb25zZS5oZWFkZXJzLmdldChcImxvY2F0aW9uXCIpO1xyXG5cclxuICAgIGlmICghdXBsb2FkVXJsKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJObyB1cGxvYWQgVVJMIHJldHVybmVkIGZyb20gR29vZ2xlIERyaXZlIEFQSVwiKTtcclxuICAgICAgY29uc29sZS5sb2coXCJSZXNwb25zZSBoZWFkZXJzOlwiLCBPYmplY3QuZnJvbUVudHJpZXMocmVzcG9uc2UuaGVhZGVycy5lbnRyaWVzKCkpKTtcclxuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6IFwiTm8gdXBsb2FkIFVSTCByZXR1cm5lZCBmcm9tIEdvb2dsZSBEcml2ZVwiIH0sIHsgc3RhdHVzOiA1MDAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coXCJTdWNjZXNzZnVsbHkgY3JlYXRlZCByZXN1bWFibGUgdXBsb2FkIFVSTFwiKTtcclxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IFxyXG4gICAgICB1cGxvYWRVcmwsXHJcbiAgICAgIG1lc3NhZ2U6IGBSZXN1bWFibGUgdXBsb2FkIFVSTCBjcmVhdGVkIGZvciAke2ZpbGVuYW1lfWBcclxuICAgIH0pO1xyXG5cclxuICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgY29uc29sZS5lcnJvcihcIlVuZXhwZWN0ZWQgZXJyb3IgaW4gdmlkZW8gdXBsb2FkIHJvdXRlOlwiLCB7XHJcbiAgICAgIG1lc3NhZ2U6IGVyci5tZXNzYWdlLFxyXG4gICAgICBzdGFjazogZXJyLnN0YWNrLFxyXG4gICAgICBuYW1lOiBlcnIubmFtZVxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIC8vIE1vcmUgc3BlY2lmaWMgZXJyb3IgaGFuZGxpbmdcclxuICAgIGxldCBlcnJvck1lc3NhZ2UgPSBcIlVuZXhwZWN0ZWQgc2VydmVyIGVycm9yXCI7XHJcbiAgICBcclxuICAgIGlmIChlcnIuY29kZSA9PT0gJ0VOT1RGT1VORCcpIHtcclxuICAgICAgZXJyb3JNZXNzYWdlID0gXCJOZXR3b3JrIGVycm9yIC0gdW5hYmxlIHRvIHJlYWNoIEdvb2dsZSBEcml2ZSBBUElcIjtcclxuICAgIH0gZWxzZSBpZiAoZXJyLm1lc3NhZ2U/LmluY2x1ZGVzKCd0aW1lb3V0JykpIHtcclxuICAgICAgZXJyb3JNZXNzYWdlID0gXCJSZXF1ZXN0IHRpbWVvdXQgLSBHb29nbGUgRHJpdmUgQVBJIGlzIHNsb3cgdG8gcmVzcG9uZFwiO1xyXG4gICAgfSBlbHNlIGlmIChlcnIubWVzc2FnZSkge1xyXG4gICAgICBlcnJvck1lc3NhZ2UgPSBgU2VydmVyIGVycm9yOiAke2Vyci5tZXNzYWdlfWA7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiBlcnJvck1lc3NhZ2UgfSwgeyBzdGF0dXM6IDUwMCB9KTtcclxuICB9XHJcbn0iXSwibmFtZXMiOlsiZ29vZ2xlIiwiTmV4dFJlc3BvbnNlIiwiUE9TVCIsInJlcSIsImJvZHkiLCJqc29uIiwicGFyc2VFcnJvciIsImNvbnNvbGUiLCJlcnJvciIsInN0YXR1cyIsImZpbGVuYW1lIiwibWltZVR5cGUiLCJmaWxlU2l6ZSIsInByaXZhdGVLZXkiLCJwcm9jZXNzIiwiZW52IiwiR09PR0xFX1BSSVZBVEVfS0VZIiwicmVwbGFjZSIsImNsaWVudEVtYWlsIiwiR09PR0xFX0NMSUVOVF9FTUFJTCIsImZvbGRlcklkIiwiR09PR0xFX0RSSVZFX0ZPTERFUl9JRCIsImhhc1ByaXZhdGVLZXkiLCJoYXNDbGllbnRFbWFpbCIsImhhc0ZvbGRlcklkIiwibG9nIiwidG9GaXhlZCIsImF1dGgiLCJHb29nbGVBdXRoIiwiY3JlZGVudGlhbHMiLCJjbGllbnRfZW1haWwiLCJwcml2YXRlX2tleSIsInNjb3BlcyIsImF1dGhDbGllbnQiLCJnZXRDbGllbnQiLCJhY2Nlc3NUb2tlbiIsImdldEFjY2Vzc1Rva2VuIiwidG9rZW4iLCJoZWFkZXJzIiwiQXV0aG9yaXphdGlvbiIsInRvU3RyaW5nIiwicmVzcG9uc2UiLCJmZXRjaCIsIm1ldGhvZCIsIkpTT04iLCJzdHJpbmdpZnkiLCJuYW1lIiwicGFyZW50cyIsInN0YXR1c1RleHQiLCJvayIsImVycm9yVGV4dCIsInRleHQiLCJPYmplY3QiLCJmcm9tRW50cmllcyIsImVudHJpZXMiLCJlcnJvck1lc3NhZ2UiLCJ1cGxvYWRVcmwiLCJnZXQiLCJtZXNzYWdlIiwiZXJyIiwic3RhY2siLCJjb2RlIiwiaW5jbHVkZXMiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./app/api/upload/video-url/route.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fupload%2Fvideo-url%2Froute&page=%2Fapi%2Fupload%2Fvideo-url%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fupload%2Fvideo-url%2Froute.ts&appDir=C%3A%5CUsers%5CGebruiker%5CDesktop%5Ccoding%5CWebsite%20for%20Saturday%204-10%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CGebruiker%5CDesktop%5Ccoding%5CWebsite%20for%20Saturday%204-10&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!**************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fupload%2Fvideo-url%2Froute&page=%2Fapi%2Fupload%2Fvideo-url%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fupload%2Fvideo-url%2Froute.ts&appDir=C%3A%5CUsers%5CGebruiker%5CDesktop%5Ccoding%5CWebsite%20for%20Saturday%204-10%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CGebruiker%5CDesktop%5Ccoding%5CWebsite%20for%20Saturday%204-10&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \**************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var C_Users_Gebruiker_Desktop_coding_Website_for_Saturday_4_10_app_api_upload_video_url_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/upload/video-url/route.ts */ \"(rsc)/./app/api/upload/video-url/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/upload/video-url/route\",\n        pathname: \"/api/upload/video-url\",\n        filename: \"route\",\n        bundlePath: \"app/api/upload/video-url/route\"\n    },\n    resolvedPagePath: \"C:\\\\Users\\\\Gebruiker\\\\Desktop\\\\coding\\\\Website for Saturday 4-10\\\\app\\\\api\\\\upload\\\\video-url\\\\route.ts\",\n    nextConfigOutput,\n    userland: C_Users_Gebruiker_Desktop_coding_Website_for_Saturday_4_10_app_api_upload_video_url_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZ1cGxvYWQlMkZ2aWRlby11cmwlMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRnVwbG9hZCUyRnZpZGVvLXVybCUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRnVwbG9hZCUyRnZpZGVvLXVybCUyRnJvdXRlLnRzJmFwcERpcj1DJTNBJTVDVXNlcnMlNUNHZWJydWlrZXIlNUNEZXNrdG9wJTVDY29kaW5nJTVDV2Vic2l0ZSUyMGZvciUyMFNhdHVyZGF5JTIwNC0xMCU1Q2FwcCZwYWdlRXh0ZW5zaW9ucz10c3gmcGFnZUV4dGVuc2lvbnM9dHMmcGFnZUV4dGVuc2lvbnM9anN4JnBhZ2VFeHRlbnNpb25zPWpzJnJvb3REaXI9QyUzQSU1Q1VzZXJzJTVDR2VicnVpa2VyJTVDRGVza3RvcCU1Q2NvZGluZyU1Q1dlYnNpdGUlMjBmb3IlMjBTYXR1cmRheSUyMDQtMTAmaXNEZXY9dHJ1ZSZ0c2NvbmZpZ1BhdGg9dHNjb25maWcuanNvbiZiYXNlUGF0aD0mYXNzZXRQcmVmaXg9Jm5leHRDb25maWdPdXRwdXQ9JnByZWZlcnJlZFJlZ2lvbj0mbWlkZGxld2FyZUNvbmZpZz1lMzAlM0QhIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQStGO0FBQ3ZDO0FBQ3FCO0FBQ3VEO0FBQ3BJO0FBQ0E7QUFDQTtBQUNBLHdCQUF3Qix5R0FBbUI7QUFDM0M7QUFDQSxjQUFjLGtFQUFTO0FBQ3ZCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxZQUFZO0FBQ1osQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBLFFBQVEsc0RBQXNEO0FBQzlEO0FBQ0EsV0FBVyw0RUFBVztBQUN0QjtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQzBGOztBQUUxRiIsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcFJvdXRlUm91dGVNb2R1bGUgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9yb3V0ZS1tb2R1bGVzL2FwcC1yb3V0ZS9tb2R1bGUuY29tcGlsZWRcIjtcbmltcG9ydCB7IFJvdXRlS2luZCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3JvdXRlLWtpbmRcIjtcbmltcG9ydCB7IHBhdGNoRmV0Y2ggYXMgX3BhdGNoRmV0Y2ggfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9saWIvcGF0Y2gtZmV0Y2hcIjtcbmltcG9ydCAqIGFzIHVzZXJsYW5kIGZyb20gXCJDOlxcXFxVc2Vyc1xcXFxHZWJydWlrZXJcXFxcRGVza3RvcFxcXFxjb2RpbmdcXFxcV2Vic2l0ZSBmb3IgU2F0dXJkYXkgNC0xMFxcXFxhcHBcXFxcYXBpXFxcXHVwbG9hZFxcXFx2aWRlby11cmxcXFxccm91dGUudHNcIjtcbi8vIFdlIGluamVjdCB0aGUgbmV4dENvbmZpZ091dHB1dCBoZXJlIHNvIHRoYXQgd2UgY2FuIHVzZSB0aGVtIGluIHRoZSByb3V0ZVxuLy8gbW9kdWxlLlxuY29uc3QgbmV4dENvbmZpZ091dHB1dCA9IFwiXCJcbmNvbnN0IHJvdXRlTW9kdWxlID0gbmV3IEFwcFJvdXRlUm91dGVNb2R1bGUoe1xuICAgIGRlZmluaXRpb246IHtcbiAgICAgICAga2luZDogUm91dGVLaW5kLkFQUF9ST1VURSxcbiAgICAgICAgcGFnZTogXCIvYXBpL3VwbG9hZC92aWRlby11cmwvcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL2FwaS91cGxvYWQvdmlkZW8tdXJsXCIsXG4gICAgICAgIGZpbGVuYW1lOiBcInJvdXRlXCIsXG4gICAgICAgIGJ1bmRsZVBhdGg6IFwiYXBwL2FwaS91cGxvYWQvdmlkZW8tdXJsL3JvdXRlXCJcbiAgICB9LFxuICAgIHJlc29sdmVkUGFnZVBhdGg6IFwiQzpcXFxcVXNlcnNcXFxcR2VicnVpa2VyXFxcXERlc2t0b3BcXFxcY29kaW5nXFxcXFdlYnNpdGUgZm9yIFNhdHVyZGF5IDQtMTBcXFxcYXBwXFxcXGFwaVxcXFx1cGxvYWRcXFxcdmlkZW8tdXJsXFxcXHJvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgd29ya0FzeW5jU3RvcmFnZSwgd29ya1VuaXRBc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgd29ya0FzeW5jU3RvcmFnZSxcbiAgICAgICAgd29ya1VuaXRBc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIHBhdGNoRmV0Y2gsICB9O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hcHAtcm91dGUuanMubWFwIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fupload%2Fvideo-url%2Froute&page=%2Fapi%2Fupload%2Fvideo-url%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fupload%2Fvideo-url%2Froute.ts&appDir=C%3A%5CUsers%5CGebruiker%5CDesktop%5Ccoding%5CWebsite%20for%20Saturday%204-10%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CGebruiker%5CDesktop%5Ccoding%5CWebsite%20for%20Saturday%204-10&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(ssr)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "../app-render/after-task-async-storage.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/app-render/after-task-async-storage.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "assert":
/*!*************************!*\
  !*** external "assert" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("assert");

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("buffer");

/***/ }),

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ "http2":
/*!************************!*\
  !*** external "http2" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("http2");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ "net":
/*!**********************!*\
  !*** external "net" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("net");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "node:buffer":
/*!******************************!*\
  !*** external "node:buffer" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:buffer");

/***/ }),

/***/ "node:fs":
/*!**************************!*\
  !*** external "node:fs" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:fs");

/***/ }),

/***/ "node:http":
/*!****************************!*\
  !*** external "node:http" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:http");

/***/ }),

/***/ "node:https":
/*!*****************************!*\
  !*** external "node:https" ***!
  \*****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:https");

/***/ }),

/***/ "node:net":
/*!***************************!*\
  !*** external "node:net" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:net");

/***/ }),

/***/ "node:path":
/*!****************************!*\
  !*** external "node:path" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:path");

/***/ }),

/***/ "node:process":
/*!*******************************!*\
  !*** external "node:process" ***!
  \*******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:process");

/***/ }),

/***/ "node:stream":
/*!******************************!*\
  !*** external "node:stream" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:stream");

/***/ }),

/***/ "node:stream/web":
/*!**********************************!*\
  !*** external "node:stream/web" ***!
  \**********************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:stream/web");

/***/ }),

/***/ "node:url":
/*!***************************!*\
  !*** external "node:url" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:url");

/***/ }),

/***/ "node:util":
/*!****************************!*\
  !*** external "node:util" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:util");

/***/ }),

/***/ "node:zlib":
/*!****************************!*\
  !*** external "node:zlib" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:zlib");

/***/ }),

/***/ "os":
/*!*********************!*\
  !*** external "os" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ "process":
/*!**************************!*\
  !*** external "process" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("process");

/***/ }),

/***/ "querystring":
/*!******************************!*\
  !*** external "querystring" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("querystring");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "tls":
/*!**********************!*\
  !*** external "tls" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("tls");

/***/ }),

/***/ "tty":
/*!**********************!*\
  !*** external "tty" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("tty");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("url");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ }),

/***/ "worker_threads":
/*!*********************************!*\
  !*** external "worker_threads" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = require("worker_threads");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/googleapis","vendor-chunks/google-auth-library","vendor-chunks/googleapis-common","vendor-chunks/math-intrinsics","vendor-chunks/gaxios","vendor-chunks/es-errors","vendor-chunks/qs","vendor-chunks/jws","vendor-chunks/call-bind-apply-helpers","vendor-chunks/json-bigint","vendor-chunks/google-logging-utils","vendor-chunks/get-proto","vendor-chunks/object-inspect","vendor-chunks/has-symbols","vendor-chunks/gopd","vendor-chunks/gcp-metadata","vendor-chunks/function-bind","vendor-chunks/ecdsa-sig-formatter","vendor-chunks/gtoken","vendor-chunks/url-template","vendor-chunks/side-channel","vendor-chunks/side-channel-weakmap","vendor-chunks/side-channel-map","vendor-chunks/side-channel-list","vendor-chunks/safe-buffer","vendor-chunks/jwa","vendor-chunks/hasown","vendor-chunks/get-intrinsic","vendor-chunks/extend","vendor-chunks/es-object-atoms","vendor-chunks/es-define-property","vendor-chunks/dunder-proto","vendor-chunks/call-bound","vendor-chunks/buffer-equal-constant-time","vendor-chunks/bignumber.js","vendor-chunks/base64-js"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fupload%2Fvideo-url%2Froute&page=%2Fapi%2Fupload%2Fvideo-url%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fupload%2Fvideo-url%2Froute.ts&appDir=C%3A%5CUsers%5CGebruiker%5CDesktop%5Ccoding%5CWebsite%20for%20Saturday%204-10%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CGebruiker%5CDesktop%5Ccoding%5CWebsite%20for%20Saturday%204-10&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();